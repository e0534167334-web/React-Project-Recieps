import { prisma } from "../db/prisma.js";
import { conflict, notFound } from "../lib/errors.js";
import { authorSelect, imageUrlFor } from "../lib/serializers.js";
import { notify } from "./notifications.service.js";
import { notifyNewAnswer } from "./forum.service.js";
import type { ModerationBody, ModerationParams } from "../schemas/admin.js";

const author = { select: authorSelect } as const;

export async function listPending(type?: ModerationParams["type"]) {
  const want = (t: ModerationParams["type"]) => !type || type === t;
  const order = [{ createdAt: "asc" as const }, { id: "asc" as const }];

  const [recipes, questions, answers] = await Promise.all([
    want("recipes")
      ? prisma.recipe.findMany({ where: { status: "PENDING" }, orderBy: order, include: { author, category: { select: { id: true, name: true } } } })
      : [],
    want("questions") ? prisma.forumQuestion.findMany({ where: { status: "PENDING" }, orderBy: order, include: { author } }) : [],
    want("answers")
      ? prisma.forumAnswer.findMany({ where: { status: "PENDING" }, orderBy: order, include: { author, question: { select: { id: true, title: true } } } })
      : [],
  ]);

  const who = (a: { id: number; displayName: string }) => ({ id: a.id, displayName: a.displayName });
  return {
    recipes: recipes.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      imageUrl: imageUrlFor(r.imagePath),
      videoUrl: r.videoUrl,
      author: who(r.author),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    questions: questions.map((q) => ({
      id: q.id,
      title: q.title,
      body: q.body,
      imageUrl: imageUrlFor(q.imagePath),
      videoUrl: q.videoUrl,
      author: who(q.author),
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    })),
    answers: answers.map((a) => ({
      id: a.id,
      body: a.body,
      question: a.question,
      imageUrl: imageUrlFor(a.imagePath),
      videoUrl: a.videoUrl,
      author: who(a.author),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    total: recipes.length + questions.length + answers.length,
  };
}

const LABEL = { recipes: "המתכון", questions: "השאלה", answers: "התשובה" } as const;
const ENTITY = { recipes: "recipe", questions: "question", answers: "answer" } as const;

export async function moderate(params: ModerationParams, body: ModerationBody) {
  const { type, id } = params;
  const data = {
    status: body.decision,
    rejectionReason: body.decision === "REJECTED" ? (body.reason ?? null) : null,
  };

  let item: { id: number; authorId: number; status: string; title?: string; questionId?: number };
  if (type === "recipes") {
    const r = await prisma.recipe.findUnique({ where: { id } });
    if (!r) throw notFound("המתכון לא נמצא");
    item = r;
  } else if (type === "questions") {
    const q = await prisma.forumQuestion.findUnique({ where: { id } });
    if (!q) throw notFound("השאלה לא נמצאה");
    item = q;
  } else {
    const a = await prisma.forumAnswer.findUnique({ where: { id } });
    if (!a) throw notFound("התשובה לא נמצאה");
    item = a;
  }
  if (item.status !== "PENDING") throw conflict("הפריט אינו ממתין לאישור");

  const updated =
    type === "recipes"
      ? await prisma.recipe.update({ where: { id }, data })
      : type === "questions"
        ? await prisma.forumQuestion.update({ where: { id }, data })
        : await prisma.forumAnswer.update({ where: { id }, data });

  const name = item.title ? `${LABEL[type]} "${item.title}"` : LABEL[type];
  // התראה על תשובה מובילה לשאלה שבה היא נמצאת
  const linkType = type === "answers" ? "question" : ENTITY[type];
  const linkId = type === "answers" && item.questionId ? item.questionId : id;
  const masculine = type === "recipes";
  if (body.decision === "APPROVED") {
    const verb = masculine ? "אושר ופורסם" : "אושרה ופורסמה";
    await notify(item.authorId, "CONTENT_APPROVED", `${name} שלך ${verb}`, linkType, linkId);
    if (type === "answers" && item.questionId) await notifyNewAnswer({ id, authorId: item.authorId, questionId: item.questionId });
  } else {
    const verb = masculine ? "לא אושר לפרסום" : "לא אושרה לפרסום";
    const reason = body.reason ? ` סיבה: ${body.reason}` : "";
    await notify(item.authorId, "CONTENT_REJECTED", `${name} שלך ${verb}.${reason}`, linkType, linkId);
  }

  return {
    type,
    id: updated.id,
    status: updated.status,
    rejectionReason: updated.rejectionReason,
  };
}
