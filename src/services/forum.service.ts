import { prisma } from "../db/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { badRequest, forbidden, notFound, unauthorized } from "../lib/errors.js";
import { assertOwnImage, isAdmin, moderationStatusFor } from "../lib/moderation.js";
import { paging, toPage } from "../lib/pagination.js";
import { authorSelect, imageUrlFor, moderationFields, serializeAuthor } from "../lib/serializers.js";
import { getStorage } from "../storage/index.js";
import { assertCategoryExists } from "./categories.service.js";
import { visibleRecipeWhere } from "./recipes.service.js";
import { notify } from "./notifications.service.js";
import type { AuthUser } from "../types/express.js";
import type {
  CreateAnswerInput,
  CreateQuestionInput,
  ListQuestionsQuery,
  UpdateAnswerInput,
  UpdateQuestionInput,
} from "../schemas/forum.js";

// ---------- כללי נראות ----------

function visibleQuestionWhere(viewer?: AuthUser): Prisma.ForumQuestionWhereInput {
  if (!viewer) return { status: "APPROVED" };
  if (viewer.role === "ADMIN") return {};
  return { OR: [{ status: "APPROVED" }, { authorId: viewer.id }] };
}

function visibleAnswerWhere(viewer?: AuthUser): Prisma.ForumAnswerWhereInput {
  if (!viewer) return { status: "APPROVED" };
  if (viewer.role === "ADMIN") return {};
  return { OR: [{ status: "APPROVED" }, { authorId: viewer.id }] };
}

/** שאלה "ממתינה לתשובה": מאושרת, לא סומנה כנפתרה, ואין לה אף תשובה מאושרת */
const UNANSWERED: Prisma.ForumQuestionWhereInput = {
  status: "APPROVED",
  isSolved: false,
  answers: { none: { status: "APPROVED" } },
};

// ---------- המרה לתשובת API ----------

const questionInclude = {
  author: { select: authorSelect },
  category: { select: { id: true, name: true } },
  recipe: { select: { id: true, title: true, status: true, visibility: true, authorId: true } },
  _count: { select: { answers: { where: { status: "APPROVED" as const } } } },
} satisfies Prisma.ForumQuestionInclude;

type QuestionRow = Prisma.ForumQuestionGetPayload<{ include: typeof questionInclude }>;

function serializeQuestion(q: QuestionRow, viewer?: AuthUser) {
  const isOwner = viewer?.id === q.authorId;
  // מתכון קשור מוצג רק אם הצופה רשאי לראות אותו
  const recipeVisible =
    q.recipe &&
    ((q.recipe.status === "APPROVED" && q.recipe.visibility === "PUBLIC") || viewer?.id === q.recipe.authorId || isAdmin(viewer));
  return {
    id: q.id,
    title: q.title,
    body: q.body,
    category: q.category,
    recipe: recipeVisible && q.recipe ? { id: q.recipe.id, title: q.recipe.title } : null,
    imageUrl: imageUrlFor(q.imagePath),
    imagePath: isOwner ? q.imagePath : undefined,
    videoUrl: q.videoUrl,
    isSolved: q.isSolved,
    ...moderationFields(q, viewer),
    showContact: q.showContact,
    author: serializeAuthor(q.author, q.showContact),
    answerCount: q._count.answers,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    permissions: { canEdit: isOwner, canDelete: isOwner || isAdmin(viewer), canMarkSolved: isOwner },
  };
}

const answerInclude = { author: { select: authorSelect } } satisfies Prisma.ForumAnswerInclude;
type AnswerRow = Prisma.ForumAnswerGetPayload<{ include: typeof answerInclude }>;

function serializeAnswer(a: AnswerRow, viewer?: AuthUser) {
  const isOwner = viewer?.id === a.authorId;
  return {
    id: a.id,
    questionId: a.questionId,
    body: a.body,
    imageUrl: imageUrlFor(a.imagePath),
    imagePath: isOwner ? a.imagePath : undefined,
    videoUrl: a.videoUrl,
    ...moderationFields(a, viewer),
    showContact: a.showContact,
    author: serializeAuthor(a.author, a.showContact),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    permissions: { canEdit: isOwner, canDelete: isOwner || isAdmin(viewer) },
  };
}

// ---------- שאלות ----------

export async function listQuestions(q: ListQuestionsQuery, viewer?: AuthUser) {
  const and: Prisma.ForumQuestionWhereInput[] = [];
  if (q.scope === "all") {
    // מנהל: כל השאלות בכל סטטוס, עם אפשרות לסנן לפי סטטוס
    if (!viewer) throw unauthorized("scope=all דורש התחברות");
    if (!isAdmin(viewer)) throw forbidden("scope=all מותר למנהל בלבד");
    if (q.status) and.push({ status: q.status });
  } else {
    // ברירת מחדל: שאלות מאושרות, ולמחובר גם השאלות שלו בכל סטטוס
    if (q.status) throw badRequest("סינון לפי status אפשרי רק עם scope=all");
    and.push(viewer ? { OR: [{ status: "APPROVED" }, { authorId: viewer.id }] } : { status: "APPROVED" });
  }
  if (q.search) {
    and.push({
      OR: [{ title: { contains: q.search, mode: "insensitive" } }, { body: { contains: q.search, mode: "insensitive" } }],
    });
  }
  if (q.categoryId) and.push({ categoryId: q.categoryId });
  if (q.solved !== undefined) and.push({ isSolved: q.solved });
  if (q.unanswered) and.push(UNANSWERED);

  const where: Prisma.ForumQuestionWhereInput = { AND: and };
  const dir = q.sort === "oldest" ? "asc" : "desc";
  const [rows, total] = await Promise.all([
    prisma.forumQuestion.findMany({
      where,
      include: questionInclude,
      orderBy: [{ createdAt: dir }, { id: dir }],
      ...paging(q.page, q.pageSize),
    }),
    prisma.forumQuestion.count({ where }),
  ]);
  return toPage(rows.map((r) => serializeQuestion(r, viewer)), total, q.page, q.pageSize);
}

export async function forumStats() {
  return { unansweredCount: await prisma.forumQuestion.count({ where: UNANSWERED }) };
}

async function loadQuestion(id: number, viewer?: AuthUser) {
  const q = await prisma.forumQuestion.findFirst({ where: { AND: [{ id }, visibleQuestionWhere(viewer)] }, include: questionInclude });
  if (!q) throw notFound("השאלה לא נמצאה");
  return q;
}

export async function getQuestion(id: number, viewer?: AuthUser) {
  return { question: serializeQuestion(await loadQuestion(id, viewer), viewer) };
}

async function assertRecipeLinkable(recipeId: number, user: AuthUser) {
  const r = await prisma.recipe.findFirst({ where: { AND: [{ id: recipeId }, visibleRecipeWhere(user)] }, select: { id: true } });
  if (!r) throw notFound("המתכון שנבחר לא נמצא");
}

export async function createQuestion(input: CreateQuestionInput, user: AuthUser) {
  if (input.categoryId) await assertCategoryExists(input.categoryId);
  if (input.recipeId) await assertRecipeLinkable(input.recipeId, user);
  assertOwnImage(user, input.imagePath);
  const imagePath = input.imagePath ?? null;
  const videoUrl = input.videoUrl ?? null;

  const created = await prisma.forumQuestion.create({
    data: {
      title: input.title,
      body: input.body,
      categoryId: input.categoryId ?? null,
      recipeId: input.recipeId ?? null,
      imagePath,
      imageUrl: imageUrlFor(imagePath),
      videoUrl,
      showContact: input.showContact,
      status: moderationStatusFor(true, imagePath, videoUrl),
      authorId: user.id,
    },
  });
  return getQuestion(created.id, user);
}

export async function updateQuestion(id: number, input: UpdateQuestionInput, user: AuthUser) {
  const existing = await loadQuestion(id, user);
  if (existing.authorId !== user.id) throw forbidden("אפשר לערוך רק שאלות שכתבת");
  if (input.categoryId) await assertCategoryExists(input.categoryId);
  if (input.recipeId) await assertRecipeLinkable(input.recipeId, user);
  if (input.imagePath !== undefined) assertOwnImage(user, input.imagePath);

  const imagePath = input.imagePath !== undefined ? input.imagePath : existing.imagePath;
  const videoUrl = input.videoUrl !== undefined ? input.videoUrl : existing.videoUrl;

  await prisma.forumQuestion.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.recipeId !== undefined ? { recipeId: input.recipeId } : {}),
      ...(input.showContact !== undefined ? { showContact: input.showContact } : {}),
      imagePath,
      imageUrl: imageUrlFor(imagePath),
      videoUrl,
      status: moderationStatusFor(true, imagePath, videoUrl),
      rejectionReason: null,
    },
  });
  if (existing.imagePath && existing.imagePath !== imagePath) await getStorage().remove(existing.imagePath);
  return getQuestion(id, user);
}

export async function setSolved(id: number, isSolved: boolean, user: AuthUser) {
  const existing = await loadQuestion(id, user);
  if (existing.authorId !== user.id) throw forbidden("רק מי שכתבה את השאלה יכולה לסמן אותה כנפתרה");
  await prisma.forumQuestion.update({ where: { id }, data: { isSolved } });
  return getQuestion(id, user);
}

export async function deleteQuestion(id: number, user: AuthUser) {
  const existing = await loadQuestion(id, user);
  if (existing.authorId !== user.id && !isAdmin(user)) throw forbidden("אפשר למחוק רק שאלות שכתבת");
  const answerImages = await prisma.forumAnswer.findMany({
    where: { questionId: id, imagePath: { not: null } },
    select: { imagePath: true },
  });
  await prisma.forumQuestion.delete({ where: { id } }); // התשובות נמחקות יחד איתה
  const storage = getStorage();
  for (const p of [existing.imagePath, ...answerImages.map((a) => a.imagePath)]) if (p) await storage.remove(p);
}

// ---------- תשובות ----------

export async function listAnswers(questionId: number, viewer?: AuthUser) {
  await loadQuestion(questionId, viewer);
  const rows = await prisma.forumAnswer.findMany({
    where: { AND: [{ questionId }, visibleAnswerWhere(viewer)] },
    include: answerInclude,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 500,
  });
  return rows.map((a) => serializeAnswer(a, viewer));
}

/** התראה לכותבת השאלה כשתשובה של מישהו אחר מתפרסמת */
export async function notifyNewAnswer(answer: { id: number; authorId: number; questionId: number }) {
  const q = await prisma.forumQuestion.findUnique({ where: { id: answer.questionId }, select: { authorId: true, title: true } });
  if (!q || q.authorId === answer.authorId) return;
  await notify(q.authorId, "NEW_ANSWER", `התקבלה תשובה חדשה לשאלה שלך: "${q.title}"`, "question", answer.questionId);
}

export async function createAnswer(questionId: number, input: CreateAnswerInput, user: AuthUser) {
  await loadQuestion(questionId, user);
  assertOwnImage(user, input.imagePath);
  const imagePath = input.imagePath ?? null;
  const videoUrl = input.videoUrl ?? null;
  const status = moderationStatusFor(true, imagePath, videoUrl);

  const created = await prisma.forumAnswer.create({
    data: {
      questionId,
      body: input.body,
      imagePath,
      imageUrl: imageUrlFor(imagePath),
      videoUrl,
      showContact: input.showContact,
      status,
      authorId: user.id,
    },
    include: answerInclude,
  });
  if (status === "APPROVED") await notifyNewAnswer(created);
  return { answer: serializeAnswer(created, user) };
}

async function loadAnswer(id: number, viewer: AuthUser) {
  const a = await prisma.forumAnswer.findFirst({
    where: { AND: [{ id }, visibleAnswerWhere(viewer), { question: visibleQuestionWhere(viewer) }] },
    include: answerInclude,
  });
  if (!a) throw notFound("התשובה לא נמצאה");
  return a;
}

export async function updateAnswer(id: number, input: UpdateAnswerInput, user: AuthUser) {
  const existing = await loadAnswer(id, user);
  if (existing.authorId !== user.id) throw forbidden("אפשר לערוך רק תשובות שכתבת");
  if (input.imagePath !== undefined) assertOwnImage(user, input.imagePath);

  const imagePath = input.imagePath !== undefined ? input.imagePath : existing.imagePath;
  const videoUrl = input.videoUrl !== undefined ? input.videoUrl : existing.videoUrl;

  const updated = await prisma.forumAnswer.update({
    where: { id },
    data: {
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.showContact !== undefined ? { showContact: input.showContact } : {}),
      imagePath,
      imageUrl: imageUrlFor(imagePath),
      videoUrl,
      status: moderationStatusFor(true, imagePath, videoUrl),
      rejectionReason: null,
    },
    include: answerInclude,
  });
  if (existing.imagePath && existing.imagePath !== imagePath) await getStorage().remove(existing.imagePath);
  return { answer: serializeAnswer(updated, user) };
}

export async function deleteAnswer(id: number, user: AuthUser) {
  const existing = await loadAnswer(id, user);
  if (existing.authorId !== user.id && !isAdmin(user)) throw forbidden("אפשר למחוק רק תשובות שכתבת");
  await prisma.forumAnswer.delete({ where: { id } });
  if (existing.imagePath) await getStorage().remove(existing.imagePath);
}
