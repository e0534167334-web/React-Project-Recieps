import { describe, expect, it } from "vitest";
import { api, makeCategory, makeUser, recipeBody } from "./helpers.js";

describe("הספר שלי", () => {
  it("שמירה, שמירה כפולה, רשימה והסרה", async () => {
    const cat = await makeCategory();
    const author = await makeUser();
    const reader = await makeUser();
    const r = (await api().post("/api/recipes").set(author.auth).send(recipeBody(cat.id))).body.recipe;

    expect((await api().post(`/api/cookbook/${r.id}`).set(reader.auth)).status).toBe(201);
    expect((await api().post(`/api/cookbook/${r.id}`).set(reader.auth)).status).toBe(200);

    const list = await api().get("/api/cookbook").set(reader.auth);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ id: r.id, isSaved: true, saveCount: 1 });

    // הספר של כל משתמש נפרד
    expect((await api().get("/api/cookbook").set(author.auth)).body.total).toBe(0);

    expect((await api().delete(`/api/cookbook/${r.id}`).set(reader.auth)).status).toBe(204);
    expect((await api().delete(`/api/cookbook/${r.id}`).set(reader.auth)).status).toBe(404);
  });

  it("אי אפשר לשמור מתכון פרטי של מישהו אחר", async () => {
    const cat = await makeCategory();
    const author = await makeUser();
    const reader = await makeUser();
    const r = (await api().post("/api/recipes").set(author.auth).send(recipeBody(cat.id, { visibility: "PRIVATE" }))).body.recipe;
    expect((await api().post(`/api/cookbook/${r.id}`).set(reader.auth)).status).toBe(404);
    expect((await api().post(`/api/cookbook/${r.id}`).set(author.auth)).status).toBe(201);
  });

  it("מתכון שהפך לפרטי נעלם מהספרים של אחרים", async () => {
    const cat = await makeCategory();
    const author = await makeUser();
    const reader = await makeUser();
    const r = (await api().post("/api/recipes").set(author.auth).send(recipeBody(cat.id))).body.recipe;
    await api().post(`/api/cookbook/${r.id}`).set(reader.auth).expect(201);
    await api().patch(`/api/recipes/${r.id}`).set(author.auth).send({ visibility: "PRIVATE" }).expect(200);
    expect((await api().get("/api/cookbook").set(reader.auth)).body.total).toBe(0);
  });

  it("בלי התחברות: 401", async () => {
    expect((await api().get("/api/cookbook")).status).toBe(401);
  });
});
