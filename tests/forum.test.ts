import { describe, expect, it } from "vitest";
import { api, makeCategory, makeUser, recipeBody } from "./helpers.js";

const question = (extra: Record<string, unknown> = {}) => ({
  title: "למה הבצק לא תופח?",
  body: "השארתי אותו שעתיים והוא כמעט לא גדל.",
  ...extra,
});

describe("פורום – שאלות", () => {
  it("שאלה חדשה, צפייה, עריכה וסימון נפתרה", async () => {
    const cat = await makeCategory();
    const asker = await makeUser();
    const other = await makeUser();
    const created = await api().post("/api/forum/questions").set(asker.auth).send(question({ categoryId: cat.id }));
    expect(created.status).toBe(201);
    const q = created.body.question;
    expect(q).toMatchObject({ status: "APPROVED", isSolved: false, answerCount: 0, category: { id: cat.id } });
    expect(q.permissions).toEqual({ canEdit: true, canDelete: true, canMarkSolved: true });

    expect((await api().get(`/api/forum/questions/${q.id}`)).status).toBe(200);

    expect((await api().patch(`/api/forum/questions/${q.id}`).set(other.auth).send({ body: "שינוי של מישהו אחר" })).status).toBe(403);
    expect((await api().patch(`/api/forum/questions/${q.id}/solved`).set(other.auth).send({ isSolved: true })).status).toBe(403);

    const solved = await api().patch(`/api/forum/questions/${q.id}/solved`).set(asker.auth).send({ isSolved: true });
    expect(solved.body.question.isSolved).toBe(true);
    expect((await api().get("/api/forum/questions").query({ solved: "true" })).body.total).toBe(1);
    expect((await api().get("/api/forum/questions").query({ solved: "false" })).body.total).toBe(0);
  });

  it("ולידציה של שאלה", async () => {
    const asker = await makeUser();
    const res = await api().post("/api/forum/questions").set(asker.auth).send({ title: "קצר", body: "" });
    expect(res.status).toBe(400);
  });

  it("קישור למתכון: רק מתכון גלוי לכותבת", async () => {
    const cat = await makeCategory();
    const a = await makeUser();
    const b = await makeUser();
    const priv = (await api().post("/api/recipes").set(a.auth).send(recipeBody(cat.id, { visibility: "PRIVATE" }))).body.recipe;
    expect((await api().post("/api/forum/questions").set(b.auth).send(question({ recipeId: priv.id }))).status).toBe(404);
    const pub = (await api().post("/api/recipes").set(a.auth).send(recipeBody(cat.id))).body.recipe;
    const res = await api().post("/api/forum/questions").set(b.auth).send(question({ recipeId: pub.id }));
    expect(res.body.question.recipe).toEqual({ id: pub.id, title: pub.title });
  });

  it("חיפוש ומיון", async () => {
    const u = await makeUser();
    await api().post("/api/forum/questions").set(u.auth).send(question({ title: "שאלה ראשונה על מרק" }));
    await api().post("/api/forum/questions").set(u.auth).send(question({ title: "שאלה שנייה על עוגה" }));
    const found = await api().get("/api/forum/questions").query({ search: "מרק" });
    expect(found.body.items.map((q: { title: string }) => q.title)).toEqual(["שאלה ראשונה על מרק"]);
    const oldest = await api().get("/api/forum/questions").query({ sort: "oldest" });
    expect(oldest.body.items[0].title).toBe("שאלה ראשונה על מרק");
  });

  it("שאלה עם סרטון ממתינה: הכותבת רואה ברשימה, אחרים לא", async () => {
    const asker = await makeUser();
    const other = await makeUser();
    const q = (await api().post("/api/forum/questions").set(asker.auth).send(question({ videoUrl: "https://v.example.com/x" }))).body.question;
    expect(q.status).toBe("PENDING");
    expect((await api().get("/api/forum/questions")).body.total).toBe(0);
    expect((await api().get("/api/forum/questions").set(other.auth)).body.total).toBe(0);
    expect((await api().get("/api/forum/questions").set(asker.auth)).body.total).toBe(1);
    expect((await api().get(`/api/forum/questions/${q.id}`).set(other.auth)).status).toBe(404);
    expect((await api().post(`/api/forum/questions/${q.id}/answers`).set(other.auth).send({ body: "תשובה" })).status).toBe(404);
  });
});

describe("פורום – תשובות והתראות", () => {
  it("תשובה של מישהו אחר יוצרת התראה לכותבת השאלה", async () => {
    const asker = await makeUser();
    const helper = await makeUser();
    const q = (await api().post("/api/forum/questions").set(asker.auth).send(question())).body.question;

    const ans = await api().post(`/api/forum/questions/${q.id}/answers`).set(helper.auth).send({ body: "כדאי לבדוק את השמרים" });
    expect(ans.status).toBe(201);
    expect(ans.body.answer.status).toBe("APPROVED");

    const notes = await api().get("/api/notifications").set(asker.auth);
    expect(notes.body.unreadCount).toBe(1);
    expect(notes.body.items[0]).toMatchObject({ type: "NEW_ANSWER", entityType: "question", entityId: q.id, isRead: false });

    // תשובה של הכותבת עצמה לא יוצרת התראה
    await api().post(`/api/forum/questions/${q.id}/answers`).set(asker.auth).send({ body: "תודה רבה!" });
    expect((await api().get("/api/notifications").set(asker.auth)).body.unreadCount).toBe(1);

    const list = await api().get(`/api/forum/questions/${q.id}/answers`);
    expect(list.body.map((a: { body: string }) => a.body)).toEqual(["כדאי לבדוק את השמרים", "תודה רבה!"]);
    expect((await api().get(`/api/forum/questions/${q.id}`)).body.question.answerCount).toBe(2);
  });

  it("תשובה עם סרטון ממתינה: לא נספרת, לא גלויה לאחרים, ולא יוצרת התראה עד אישור", async () => {
    const asker = await makeUser();
    const helper = await makeUser();
    const q = (await api().post("/api/forum/questions").set(asker.auth).send(question())).body.question;
    const a = (await api().post(`/api/forum/questions/${q.id}/answers`).set(helper.auth).send({ body: "ראו בסרטון", videoUrl: "https://v.example.com/a" }))
      .body.answer;
    expect(a.status).toBe("PENDING");
    expect((await api().get(`/api/forum/questions/${q.id}/answers`).set(asker.auth)).body).toHaveLength(0);
    expect((await api().get(`/api/forum/questions/${q.id}/answers`).set(helper.auth)).body).toHaveLength(1);
    expect((await api().get(`/api/forum/questions/${q.id}`)).body.question.answerCount).toBe(0);
    expect((await api().get("/api/notifications").set(asker.auth)).body.total).toBe(0);
  });

  it("עריכה ומחיקה של תשובה: רק הכותב, ומנהל יכול למחוק", async () => {
    const asker = await makeUser();
    const helper = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const q = (await api().post("/api/forum/questions").set(asker.auth).send(question())).body.question;
    const a = (await api().post(`/api/forum/questions/${q.id}/answers`).set(helper.auth).send({ body: "תשובה" })).body.answer;
    expect((await api().patch(`/api/forum/answers/${a.id}`).set(asker.auth).send({ body: "שינוי" })).status).toBe(403);
    expect((await api().patch(`/api/forum/answers/${a.id}`).set(helper.auth).send({ body: "תשובה מעודכנת" })).body.answer.body).toBe("תשובה מעודכנת");
    expect((await api().delete(`/api/forum/answers/${a.id}`).set(asker.auth)).status).toBe(403);
    expect((await api().delete(`/api/forum/answers/${a.id}`).set(admin.auth)).status).toBe(204);
  });

  it("מחיקת שאלה מוחקת את התשובות שלה", async () => {
    const asker = await makeUser();
    const helper = await makeUser();
    const q = (await api().post("/api/forum/questions").set(asker.auth).send(question())).body.question;
    const a = (await api().post(`/api/forum/questions/${q.id}/answers`).set(helper.auth).send({ body: "תשובה" })).body.answer;
    expect((await api().delete(`/api/forum/questions/${q.id}`).set(helper.auth)).status).toBe(403);
    expect((await api().delete(`/api/forum/questions/${q.id}`).set(asker.auth)).status).toBe(204);
    expect((await api().patch(`/api/forum/answers/${a.id}`).set(helper.auth).send({ body: "עוד" })).status).toBe(404);
  });
});

describe("פורום – ממתינות לתשובה", () => {
  it("סינון unanswered ומונה stats", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const q1 = (await api().post("/api/forum/questions").set(a.auth).send(question({ title: "שאלה בלי תשובה" }))).body.question;
    const q2 = (await api().post("/api/forum/questions").set(a.auth).send(question({ title: "שאלה עם תשובה" }))).body.question;
    const q3 = (await api().post("/api/forum/questions").set(a.auth).send(question({ title: "שאלה שנפתרה לבד" }))).body.question;
    await api().post(`/api/forum/questions/${q2.id}/answers`).set(b.auth).send({ body: "הנה תשובה" });
    await api().patch(`/api/forum/questions/${q3.id}/solved`).set(a.auth).send({ isSolved: true });
    // תשובה ממתינה לא נחשבת
    await api().post(`/api/forum/questions/${q1.id}/answers`).set(b.auth).send({ body: "בסרטון", videoUrl: "https://v.example.com/1" });

    const res = await api().get("/api/forum/questions").query({ unanswered: "true" });
    expect(res.body.items.map((q: { id: number }) => q.id)).toEqual([q1.id]);
    expect((await api().get("/api/forum/stats")).body).toEqual({ unansweredCount: 1 });
  });
});

describe("פורום – מנהל רואה את כל השאלות (scope=all)", () => {
  it("כולל ממתינות ונדחות, עם סינון לפי סטטוס; משתמשת רגילה מקבלת 403", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    await api().post("/api/forum/questions").set(a.auth).send(question({ title: "שאלה מאושרת רגילה" }));
    const pending = (await api().post("/api/forum/questions").set(b.auth).send(question({ title: "שאלה ממתינה לאישור", videoUrl: "https://v.example.com/p" }))).body.question;
    const rejected = (await api().post("/api/forum/questions").set(b.auth).send(question({ title: "שאלה שתידחה בהמשך", videoUrl: "https://v.example.com/r" }))).body.question;
    await api().patch(`/api/admin/moderation/questions/${rejected.id}`).set(admin.auth).send({ decision: "REJECTED" }).expect(200);

    // ברירת מחדל: גם המנהל רואה רק מאושרות (ואת שלו)
    expect((await api().get("/api/forum/questions").set(admin.auth)).body.total).toBe(1);

    const all = await api().get("/api/forum/questions").query({ scope: "all" }).set(admin.auth);
    expect(all.body.total).toBe(3);
    const onlyRejected = await api().get("/api/forum/questions").query({ scope: "all", status: "REJECTED" }).set(admin.auth);
    expect(onlyRejected.body.items.map((q: { id: number }) => q.id)).toEqual([rejected.id]);
    expect(onlyRejected.body.items[0].status).toBe("REJECTED");
    const onlyPending = await api().get("/api/forum/questions").query({ scope: "all", status: "PENDING" }).set(admin.auth);
    expect(onlyPending.body.items.map((q: { id: number }) => q.id)).toEqual([pending.id]);

    expect((await api().get("/api/forum/questions").query({ scope: "all" }).set(a.auth)).status).toBe(403);
    expect((await api().get("/api/forum/questions").query({ scope: "all" })).status).toBe(401);
    expect((await api().get("/api/forum/questions").query({ status: "PENDING" }).set(admin.auth)).status).toBe(400);
  });
});
