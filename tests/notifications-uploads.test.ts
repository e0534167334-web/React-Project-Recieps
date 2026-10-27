import { describe, expect, it } from "vitest";
import { api, makeCategory, makeUser, PNG_1PX, recipeBody } from "./helpers.js";
import { prisma } from "../src/db/prisma.js";
import { getStorage, setStorage } from "../src/storage/index.js";
import { createImageStorage, MemoryImageStorage } from "../src/storage/imageStorage.js";

describe("התראות", () => {
  it("סימון כנקראה, אי אפשר לגעת בהתראה של אחר, וסימון הכול", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const mk = (userId: number) =>
      prisma.notification.create({ data: { userId, type: "NEW_ANSWER", message: "הודעה", entityType: "question", entityId: 1 } });
    const n1 = await mk(a.user.id);
    await mk(a.user.id);
    const nb = await mk(b.user.id);

    expect((await api().patch(`/api/notifications/${nb.id}/read`).set(a.auth)).status).toBe(404);
    const read = await api().patch(`/api/notifications/${n1.id}/read`).set(a.auth);
    expect(read.body.notification.isRead).toBe(true);

    const unread = await api().get("/api/notifications").query({ unreadOnly: "true" }).set(a.auth);
    expect(unread.body).toMatchObject({ total: 1, unreadCount: 1 });

    expect((await api().patch("/api/notifications/read-all").set(a.auth)).body).toEqual({ updated: 1 });
    expect((await api().get("/api/notifications").set(a.auth)).body.unreadCount).toBe(0);
    expect((await api().get("/api/notifications").set(b.auth)).body.unreadCount).toBe(1);
  });
});

describe("העלאת תמונות", () => {
  it("העלאה תקינה וצירוף למתכון: ממתין לאישור, והתמונה מוחלפת ונמחקת", async () => {
    const cat = await makeCategory();
    const u = await makeUser();
    const up = await api().post("/api/uploads/image").set(u.auth).attach("image", PNG_1PX, { filename: "a.png", contentType: "image/png" });
    expect(up.status).toBe(201);
    expect(up.body.imagePath).toMatch(new RegExp(`^uploads/${u.user.id}/[a-f0-9-]{36}\\.png$`));
    expect(up.body.imageUrl).toContain(up.body.imagePath);

    const r = (await api().post("/api/recipes").set(u.auth).send(recipeBody(cat.id, { imagePath: up.body.imagePath }))).body.recipe;
    expect(r.status).toBe("PENDING");
    expect(r.imageUrl).toBe(up.body.imageUrl);
    expect(r.imagePath).toBe(up.body.imagePath);

    const storage = getStorage() as MemoryImageStorage;
    expect(storage.files.has(up.body.imagePath)).toBe(true);
    await api().patch(`/api/recipes/${r.id}`).set(u.auth).send({ imagePath: null }).expect(200);
    expect(storage.files.has(up.body.imagePath)).toBe(false);
  });

  it("אי אפשר לצרף תמונה של משתמש אחר", async () => {
    const cat = await makeCategory();
    const a = await makeUser();
    const b = await makeUser();
    const up = await api().post("/api/uploads/image").set(a.auth).attach("image", PNG_1PX, "a.png");
    const res = await api().post("/api/recipes").set(b.auth).send(recipeBody(cat.id, { imagePath: up.body.imagePath }));
    expect(res.status).toBe(403);
  });

  it("קובץ שאינו תמונה: 415, גם אם הוצהר כתמונה", async () => {
    const u = await makeUser();
    const res = await api()
      .post("/api/uploads/image")
      .set(u.auth)
      .attach("image", Buffer.from("<script>alert(1)</script>"), { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(415);
  });

  it("קובץ גדול מדי: 413", async () => {
    const u = await makeUser();
    const big = Buffer.concat([PNG_1PX, Buffer.alloc(1024 * 1024 + 10)]);
    const res = await api().post("/api/uploads/image").set(u.auth).attach("image", big, "big.png");
    expect(res.status).toBe(413);
  });

  it("בלי קובץ: 400; בלי התחברות: 401", async () => {
    const u = await makeUser();
    expect((await api().post("/api/uploads/image").set(u.auth)).status).toBe(400);
    expect((await api().post("/api/uploads/image").attach("image", PNG_1PX, "a.png")).status).toBe(401);
  });

  it("imagePath מומצא: 400", async () => {
    const cat = await makeCategory();
    const u = await makeUser();
    const res = await api().post("/api/recipes").set(u.auth).send(recipeBody(cat.id, { imagePath: "../../etc/passwd" }));
    expect(res.status).toBe(400);
  });

  it("כשאחסון לא מוגדר: 503 עם הסבר", async () => {
    setStorage(createImageStorage()); // בבדיקות אין SUPABASE_URL
    const u = await makeUser();
    const res = await api().post("/api/uploads/image").set(u.auth).attach("image", PNG_1PX, "a.png");
    expect(res.status).toBe(503);
    expect(res.body.error.message).toContain("SUPABASE");
  });
});
