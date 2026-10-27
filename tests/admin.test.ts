import { describe, expect, it } from "vitest";
import { api, makeCategory, makeUser, recipeBody } from "./helpers.js";

describe("ניהול – הרשאות מנהל", () => {
  it("משתמש רגיל מקבל 403, אורח מקבל 401", async () => {
    const user = await makeUser();
    expect((await api().get("/api/admin/pending")).status).toBe(401);
    expect((await api().get("/api/admin/pending").set(user.auth)).status).toBe(403);
    expect((await api().post("/api/categories").set(user.auth).send({ name: "חדשה" })).status).toBe(403);
    expect((await api().patch("/api/admin/moderation/recipes/1").set(user.auth).send({ decision: "APPROVED" })).status).toBe(403);
  });
});

describe("ניהול – תור אישורים", () => {
  it("אישור מתכון: מתפרסם, והכותבת מקבלת התראה", async () => {
    const cat = await makeCategory();
    const owner = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const r = (await api().post("/api/recipes").set(owner.auth).send(recipeBody(cat.id, { videoUrl: "https://v.example.com/1" }))).body.recipe;

    const queue = await api().get("/api/admin/pending").set(admin.auth);
    expect(queue.status).toBe(200);
    expect(queue.body.total).toBe(1);
    expect(queue.body.recipes[0]).toMatchObject({ id: r.id, title: r.title });

    const res = await api().patch(`/api/admin/moderation/recipes/${r.id}`).set(admin.auth).send({ decision: "APPROVED" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "APPROVED", rejectionReason: null });
    expect((await api().get(`/api/recipes/${r.id}`)).status).toBe(200);

    const notes = await api().get("/api/notifications").set(owner.auth);
    expect(notes.body.items[0]).toMatchObject({ type: "CONTENT_APPROVED", entityType: "recipe", entityId: r.id });

    // החלטה שנייה על אותו פריט
    expect((await api().patch(`/api/admin/moderation/recipes/${r.id}`).set(admin.auth).send({ decision: "REJECTED" })).status).toBe(409);
  });

  it("דחייה עם סיבה: הכותבת רואה את הסיבה, אחרים לא רואים את המתכון", async () => {
    const cat = await makeCategory();
    const owner = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const r = (await api().post("/api/recipes").set(owner.auth).send(recipeBody(cat.id, { videoUrl: "https://v.example.com/1" }))).body.recipe;
    await api().patch(`/api/admin/moderation/recipes/${r.id}`).set(admin.auth).send({ decision: "REJECTED", reason: "הסרטון לא קשור" }).expect(200);

    const own = await api().get(`/api/recipes/${r.id}`).set(owner.auth);
    expect(own.body.recipe).toMatchObject({ status: "REJECTED", rejectionReason: "הסרטון לא קשור" });
    expect((await api().get(`/api/recipes/${r.id}`)).status).toBe(404);

    const notes = await api().get("/api/notifications").set(owner.auth);
    expect(notes.body.items[0].type).toBe("CONTENT_REJECTED");
    expect(notes.body.items[0].message).toContain("הסרטון לא קשור");

    // עריכה של תוכן שנדחה שולחת אותו שוב לאישור
    const again = await api().patch(`/api/recipes/${r.id}`).set(owner.auth).send({ videoUrl: "https://v.example.com/2" });
    expect(again.body.recipe).toMatchObject({ status: "PENDING", rejectionReason: null });
  });

  it("אישור תשובה שולח התראה גם לכותבת השאלה", async () => {
    const asker = await makeUser();
    const helper = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const q = (await api().post("/api/forum/questions").set(asker.auth).send({ title: "שאלה לבדיקה", body: "תוכן השאלה לבדיקה" })).body.question;
    const a = (await api().post(`/api/forum/questions/${q.id}/answers`).set(helper.auth).send({ body: "ראו בסרטון", videoUrl: "https://v.example.com/a" }))
      .body.answer;

    const queue = await api().get("/api/admin/pending").query({ type: "answers" }).set(admin.auth);
    expect(queue.body.answers[0]).toMatchObject({ id: a.id, question: { id: q.id } });
    expect(queue.body.recipes).toEqual([]);

    await api().patch(`/api/admin/moderation/answers/${a.id}`).set(admin.auth).send({ decision: "APPROVED" }).expect(200);
    const askerNotes = await api().get("/api/notifications").set(asker.auth);
    expect(askerNotes.body.items.map((n: { type: string }) => n.type)).toEqual(["NEW_ANSWER"]);
    const helperNotes = await api().get("/api/notifications").set(helper.auth);
    expect(helperNotes.body.items[0]).toMatchObject({ type: "CONTENT_APPROVED", entityType: "question", entityId: q.id });
  });

  it("ולידציה של החלטה ופריט שלא קיים", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    expect((await api().patch("/api/admin/moderation/recipes/1").set(admin.auth).send({ decision: "MAYBE" })).status).toBe(400);
    expect((await api().patch("/api/admin/moderation/cats/1").set(admin.auth).send({ decision: "APPROVED" })).status).toBe(400);
    expect((await api().patch("/api/admin/moderation/recipes/999").set(admin.auth).send({ decision: "APPROVED" })).status).toBe(404);
  });
});

describe("ניהול – קטגוריות", () => {
  it("מנהל מוסיף, משנה ומוחק; כפילות מחזירה 409", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const c = await api().post("/api/categories").set(admin.auth).send({ name: "סלטים" });
    expect(c.status).toBe(201);
    expect((await api().post("/api/categories").set(admin.auth).send({ name: "סלטים" })).status).toBe(409);
    const renamed = await api().patch(`/api/categories/${c.body.category.id}`).set(admin.auth).send({ name: "סלטים טריים" });
    expect(renamed.body.category.name).toBe("סלטים טריים");
    const list = await api().get("/api/categories");
    expect(list.body).toEqual([{ id: c.body.category.id, name: "סלטים טריים", recipeCount: 0 }]);
    expect((await api().delete(`/api/categories/${c.body.category.id}`).set(admin.auth)).status).toBe(204);
  });

  it("אי אפשר למחוק קטגוריה שיש בה מתכונים", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const cat = await makeCategory();
    await api().post("/api/recipes").set(admin.auth).send(recipeBody(cat.id)).expect(201);
    const res = await api().delete(`/api/categories/${cat.id}`).set(admin.auth);
    expect(res.status).toBe(409);
  });
});
