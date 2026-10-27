import { describe, expect, it } from "vitest";
import { api, makeCategory, makeUser, recipeBody } from "./helpers.js";
import { prisma } from "../src/db/prisma.js";

describe("מתכונים – CRUD", () => {
  it("הוספה, צפייה, עריכה ומחיקה של מתכון", async () => {
    const cat = await makeCategory();
    const { auth, user } = await makeUser({ contactEmail: "c@x.com" });

    const created = await api().post("/api/recipes").set(auth).send(recipeBody(cat.id, { showContact: true }));
    expect(created.status).toBe(201);
    const r = created.body.recipe;
    expect(r).toMatchObject({ title: "עוגת תפוזים", status: "APPROVED", visibility: "PUBLIC", category: { id: cat.id } });
    expect(r.ingredients).toEqual(["3 ביצים", "1 כוס סוכר", "2 כוסות קמח", "1 כוס מיץ תפוזים"]);
    expect(r.author).toEqual({ id: user.id, displayName: user.displayName, contactEmail: "c@x.com", contactPhone: null });
    expect(r.permissions).toEqual({ canEdit: true, canDelete: true });

    const guestView = await api().get(`/api/recipes/${r.id}`);
    expect(guestView.status).toBe(200);
    expect(guestView.body.recipe.permissions).toEqual({ canEdit: false, canDelete: false });
    expect(guestView.body.recipe.rejectionReason).toBeUndefined();

    const edited = await api()
      .patch(`/api/recipes/${r.id}`)
      .set(auth)
      .send({ title: "עוגת תפוזים משודרגת", ingredients: ["4 ביצים", "  ", "סוכר"], prepTimeMinutes: null });
    expect(edited.status).toBe(200);
    expect(edited.body.recipe.title).toBe("עוגת תפוזים משודרגת");
    expect(edited.body.recipe.ingredients).toEqual(["4 ביצים", "סוכר"]);
    expect(edited.body.recipe.prepTimeMinutes).toBeNull();

    expect((await api().delete(`/api/recipes/${r.id}`).set(auth)).status).toBe(204);
    expect((await api().get(`/api/recipes/${r.id}`)).status).toBe(404);
    expect(await prisma.recipeIngredient.count()).toBe(0);
  });

  it("תבליטים ומספור בתחילת שורה מנוקים מהרכיבים", async () => {
    const cat = await makeCategory();
    const { auth } = await makeUser();
    const res = await api().post("/api/recipes").set(auth).send(recipeBody(cat.id, { ingredients: "- 2 ביצים\n• קמח\n3. סוכר\n\n" }));
    expect(res.body.recipe.ingredients).toEqual(["2 ביצים", "קמח", "סוכר"]);
  });

  it("פרטי קשר לא מוצגים כשלא סומן showContact", async () => {
    const cat = await makeCategory();
    const { auth } = await makeUser({ contactPhone: "050-0000000" });
    const res = await api().post("/api/recipes").set(auth).send(recipeBody(cat.id));
    expect(res.body.recipe.author.contactPhone).toBeUndefined();
  });
});

describe("מתכונים – ולידציה", () => {
  it("שדות חובה חסרים", async () => {
    const { auth } = await makeUser();
    const res = await api().post("/api/recipes").set(auth).send({ title: "א" });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["title", "categoryId", "difficulty", "kosherType", "ingredients", "instructions"]));
  });

  it("ערכים לא תקינים", async () => {
    const cat = await makeCategory();
    const { auth } = await makeUser();
    const bad = await api()
      .post("/api/recipes")
      .set(auth)
      .send(recipeBody(cat.id, { difficulty: "SUPER", prepTimeMinutes: 0, ingredients: "\n\n", videoUrl: "http://insecure.com/v" }));
    expect(bad.status).toBe(400);
    const fields = bad.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["difficulty", "prepTimeMinutes", "ingredients", "videoUrl"]));
  });

  it("קטגוריה שלא קיימת: 404", async () => {
    const { auth } = await makeUser();
    expect((await api().post("/api/recipes").set(auth).send(recipeBody(999))).status).toBe(404);
  });

  it("מזהה לא תקין בכתובת: 400", async () => {
    expect((await api().get("/api/recipes/abc")).status).toBe(400);
  });

  it("JSON לא תקין: 400", async () => {
    const { auth } = await makeUser();
    const res = await api().post("/api/recipes").set(auth).set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("עריכה ריקה: 400", async () => {
    const cat = await makeCategory();
    const { auth } = await makeUser();
    const r = (await api().post("/api/recipes").set(auth).send(recipeBody(cat.id))).body.recipe;
    expect((await api().patch(`/api/recipes/${r.id}`).set(auth).send({})).status).toBe(400);
  });
});

describe("מתכונים – הרשאות ופרטיות", () => {
  it("הוספה בלי התחברות: 401", async () => {
    const cat = await makeCategory();
    expect((await api().post("/api/recipes").send(recipeBody(cat.id))).status).toBe(401);
  });

  it("משתמש אחר לא יכול לערוך או למחוק: 403", async () => {
    const cat = await makeCategory();
    const owner = await makeUser();
    const other = await makeUser();
    const r = (await api().post("/api/recipes").set(owner.auth).send(recipeBody(cat.id))).body.recipe;
    expect((await api().patch(`/api/recipes/${r.id}`).set(other.auth).send({ title: "גנוב" })).status).toBe(403);
    expect((await api().delete(`/api/recipes/${r.id}`).set(other.auth)).status).toBe(403);
  });

  it("מנהל יכול למחוק כל מתכון, אבל לא לערוך", async () => {
    const cat = await makeCategory();
    const owner = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const r = (await api().post("/api/recipes").set(owner.auth).send(recipeBody(cat.id))).body.recipe;
    expect((await api().patch(`/api/recipes/${r.id}`).set(admin.auth).send({ title: "שינוי" })).status).toBe(403);
    expect((await api().delete(`/api/recipes/${r.id}`).set(admin.auth)).status).toBe(204);
  });

  it("מתכון פרטי: הכותבת רואה, אחרים מקבלים 404, לא מופיע ברשימה הציבורית", async () => {
    const cat = await makeCategory();
    const owner = await makeUser();
    const other = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const r = (await api().post("/api/recipes").set(owner.auth).send(recipeBody(cat.id, { visibility: "PRIVATE", videoUrl: "https://v.example.com/1" })))
      .body.recipe;
    expect(r.status).toBe("APPROVED"); // מתכון פרטי לא עובר אישור

    expect((await api().get(`/api/recipes/${r.id}`).set(owner.auth)).status).toBe(200);
    expect((await api().get(`/api/recipes/${r.id}`).set(other.auth)).status).toBe(404);
    expect((await api().get(`/api/recipes/${r.id}`)).status).toBe(404);
    expect((await api().get(`/api/recipes/${r.id}`).set(admin.auth)).status).toBe(200);
    expect((await api().patch(`/api/recipes/${r.id}`).set(other.auth).send({ title: "x y" })).status).toBe(404);

    const list = await api().get("/api/recipes").set(owner.auth);
    expect(list.body.total).toBe(0);
    const mine = await api().get("/api/recipes/mine").set(owner.auth);
    expect(mine.body.items.map((x: { id: number }) => x.id)).toEqual([r.id]);
    expect((await api().get("/api/recipes/mine").set(other.auth)).body.total).toBe(0);
  });
});

describe("מתכונים – מה כל תפקיד רואה ברשימה (scope)", () => {
  async function seed() {
    const cat = await makeCategory();
    const a = await makeUser();
    const b = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const mk = (auth: Record<string, string>, extra: Record<string, unknown>) =>
      api().post("/api/recipes").set(auth).send(recipeBody(cat.id, extra)).then((r) => r.body.recipe);
    await mk(a.auth, { title: "ציבורי של א" });
    await mk(a.auth, { title: "פרטי של א", visibility: "PRIVATE" });
    await mk(b.auth, { title: "ציבורי של ב" });
    await mk(b.auth, { title: "פרטי של ב", visibility: "PRIVATE" });
    await mk(b.auth, { title: "ממתין של ב", videoUrl: "https://v.example.com/1" });
    return { a, b, admin };
  }
  const titles = (res: { body: { items: { title: string }[] } }) => res.body.items.map((i) => i.title).sort();

  it("משתמשת רגילה רואה את שלה ואת הציבוריים (scope=visible)", async () => {
    const { a } = await seed();
    const res = await api().get("/api/recipes").query({ scope: "visible" }).set(a.auth);
    expect(titles(res)).toEqual(["ציבורי של א", "ציבורי של ב", "פרטי של א"].sort());
  });

  it("מנהל רואה את כל הרשומות (scope=all), ואפשר לסנן לפי סטטוס", async () => {
    const { admin } = await seed();
    expect((await api().get("/api/recipes").query({ scope: "all" }).set(admin.auth)).body.total).toBe(5);
    const pending = await api().get("/api/recipes").query({ scope: "all", status: "PENDING" }).set(admin.auth);
    expect(titles(pending)).toEqual(["ממתין של ב"]);
    const priv = await api().get("/api/recipes").query({ scope: "all", visibility: "PRIVATE" }).set(admin.auth);
    expect(titles(priv)).toEqual(["פרטי של א", "פרטי של ב"].sort());
  });

  it("scope=all למשתמשת רגילה: 403; scope=visible לאורח: 401; status בלי scope: 400", async () => {
    const { a } = await seed();
    expect((await api().get("/api/recipes").query({ scope: "all" }).set(a.auth)).status).toBe(403);
    expect((await api().get("/api/recipes").query({ scope: "visible" })).status).toBe(401);
    expect((await api().get("/api/recipes").query({ status: "PENDING" })).status).toBe(400);
    expect((await api().get("/api/recipes")).body.total).toBe(2);
  });
});

describe("מתכונים – אישור מנהל", () => {
  it("מתכון ציבורי עם סרטון ממתין לאישור ומוסתר מאחרים", async () => {
    const cat = await makeCategory();
    const owner = await makeUser();
    const other = await makeUser();
    const r = (await api().post("/api/recipes").set(owner.auth).send(recipeBody(cat.id, { videoUrl: "https://v.example.com/1" }))).body.recipe;
    expect(r.status).toBe("PENDING");
    expect((await api().get(`/api/recipes/${r.id}`).set(other.auth)).status).toBe(404);
    expect((await api().get("/api/recipes")).body.total).toBe(0);
  });

  it("כל עריכה של מתכון מאושר עם סרטון מחזירה אותו לממתין, ומחיקת הסרטון מאשרת", async () => {
    const cat = await makeCategory();
    const owner = await makeUser();
    const r = (await api().post("/api/recipes").set(owner.auth).send(recipeBody(cat.id, { videoUrl: "https://v.example.com/1" }))).body.recipe;
    await prisma.recipe.update({ where: { id: r.id }, data: { status: "APPROVED" } });

    const textOnly = await api().patch(`/api/recipes/${r.id}`).set(owner.auth).send({ title: "שינוי טקסט בלבד" });
    expect(textOnly.body.recipe.status).toBe("PENDING");

    const removed = await api().patch(`/api/recipes/${r.id}`).set(owner.auth).send({ videoUrl: null });
    expect(removed.body.recipe.status).toBe("APPROVED");
    expect(removed.body.recipe.videoUrl).toBeNull();
  });

  it("הפיכת מתכון פרטי עם סרטון לציבורי שולחת לאישור", async () => {
    const cat = await makeCategory();
    const owner = await makeUser();
    const r = (await api().post("/api/recipes").set(owner.auth).send(recipeBody(cat.id, { visibility: "PRIVATE", videoUrl: "https://v.example.com/1" })))
      .body.recipe;
    const pub = await api().patch(`/api/recipes/${r.id}`).set(owner.auth).send({ visibility: "PUBLIC" });
    expect(pub.body.recipe.status).toBe("PENDING");
  });
});

describe("מתכונים – חיפוש, סינון ומיון", () => {
  async function seed() {
    const cakes = await makeCategory("עוגות");
    const soups = await makeCategory("מרקים");
    const a = await makeUser();
    const b = await makeUser();
    const mk = (body: Record<string, unknown>) => api().post("/api/recipes").set(a.auth).send(body).then((r) => r.body.recipe);
    const r1 = await mk(recipeBody(cakes.id, { title: "עוגת שוקולד", prepTimeMinutes: 60, kosherType: "DAIRY", ingredients: "2 ביצים\nשוקולד\nחמאה" }));
    const r2 = await mk(recipeBody(soups.id, { title: "מרק ירקות", description: "חם ומנחם", prepTimeMinutes: 30, difficulty: "MEDIUM", ingredients: "קישוא\nגזר\nבצל" }));
    const r3 = await mk(recipeBody(cakes.id, { title: "פשטידה", prepTimeMinutes: null, ingredients: "4 ביצים\n2 קישואים\nגבינה", kosherType: "DAIRY" }));
    await api().post(`/api/cookbook/${r2.id}`).set(b.auth);
    await api().post(`/api/cookbook/${r2.id}`).set(a.auth);
    await api().post(`/api/cookbook/${r3.id}`).set(b.auth);
    return { cakes, soups, r1, r2, r3, b };
  }
  const titles = (res: { body: { items: { title: string }[] } }) => res.body.items.map((i) => i.title);

  it("חיפוש טקסט בשם ובתיאור", async () => {
    await seed();
    expect(titles(await api().get("/api/recipes").query({ search: "שוקולד" }))).toEqual(["עוגת שוקולד"]);
    expect(titles(await api().get("/api/recipes").query({ search: "מנחם" }))).toEqual(["מרק ירקות"]);
  });

  it("סינון לפי קטגוריה, קושי, סוג וזמן הכנה", async () => {
    const { soups } = await seed();
    expect(titles(await api().get("/api/recipes").query({ categoryId: soups.id }))).toEqual(["מרק ירקות"]);
    expect(titles(await api().get("/api/recipes").query({ difficulty: "MEDIUM" }))).toEqual(["מרק ירקות"]);
    expect(titles(await api().get("/api/recipes").query({ kosherType: "DAIRY" })).sort()).toEqual(["עוגת שוקולד", "פשטידה"].sort());
    // מתכון בלי זמן הכנה לא מופיע בסינון לפי זמן
    expect(titles(await api().get("/api/recipes").query({ maxPrepTime: 45 }))).toEqual(["מרק ירקות"]);
  });

  it("סינון לפי מצרכים: כל המצרכים חייבים להופיע, יחיד ורבים מתאימים", async () => {
    await seed();
    expect(titles(await api().get("/api/recipes").query({ ingredients: "ביצים,קישוא" }))).toEqual(["פשטידה"]);
    expect(titles(await api().get("/api/recipes").query({ ingredients: "ביצה" })).sort()).toEqual(["עוגת שוקולד", "פשטידה"].sort());
    expect(titles(await api().get("/api/recipes").query({ ingredients: "קישוא" })).sort()).toEqual(["מרק ירקות", "פשטידה"].sort());
  });

  it("מיון לפי זמן הכנה (בלי זמן בסוף) ולפי הנשמרים ביותר", async () => {
    await seed();
    expect(titles(await api().get("/api/recipes").query({ sort: "prepTime" }))).toEqual(["מרק ירקות", "עוגת שוקולד", "פשטידה"]);
    expect(titles(await api().get("/api/recipes").query({ sort: "mostSaved" }))).toEqual(["מרק ירקות", "פשטידה", "עוגת שוקולד"]);
  });

  it("עמודים ו־isSaved", async () => {
    const { b, r2 } = await seed();
    const p1 = await api().get("/api/recipes").query({ pageSize: 2, page: 1 });
    expect(p1.body).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(p1.body.items).toHaveLength(2);
    const p2 = await api().get("/api/recipes").query({ pageSize: 2, page: 2 });
    expect(p2.body.items).toHaveLength(1);
    const asB = await api().get("/api/recipes").set(b.auth);
    const saved = asB.body.items.find((i: { id: number }) => i.id === r2.id);
    expect(saved.isSaved).toBe(true);
    expect((await api().get("/api/recipes").query({ pageSize: 51 })).status).toBe(400);
  });
});
