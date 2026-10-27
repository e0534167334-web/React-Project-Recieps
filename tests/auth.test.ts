import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { api, makeUser, PASSWORD } from "./helpers.js";

describe("הרשמה והתחברות", () => {
  it("הרשמה תקינה מחזירה Token ומשתמש רגיל, בלי סיסמה", async () => {
    const res = await api()
      .post("/api/auth/register")
      .send({ displayName: "שירה", email: "Shira@Example.com", password: "Recipe2026", role: "ADMIN" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user).toMatchObject({ email: "shira@example.com", displayName: "שירה", role: "USER" });
    expect(JSON.stringify(res.body)).not.toMatch(/password|Hash/i);
  });

  it("הרשמה עם אימייל קיים מחזירה 409", async () => {
    const body = { displayName: "שירה", email: "dup@example.com", password: "Recipe2026" };
    await api().post("/api/auth/register").send(body).expect(201);
    const res = await api().post("/api/auth/register").send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("ולידציה בהרשמה: סיסמה חלשה ואימייל לא תקין", async () => {
    const res = await api().post("/api/auth/register").send({ displayName: "א", email: "not-an-email", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["displayName", "email", "password"]));
  });

  it("Login תקין", async () => {
    const { user } = await makeUser();
    const res = await api().post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    const me = await api().get("/api/auth/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(user.email);
  });

  it("Login שגוי מחזיר 401, גם לאימייל שלא קיים", async () => {
    const { user } = await makeUser();
    const wrong = await api().post("/api/auth/login").send({ email: user.email, password: "Wrong12345" });
    expect(wrong.status).toBe(401);
    const missing = await api().post("/api/auth/login").send({ email: "nobody@example.com", password: "Wrong12345" });
    expect(missing.status).toBe(401);
    expect(missing.body.error.message).toBe(wrong.body.error.message);
  });
});

describe("Token", () => {
  it("בלי Token: 401", async () => {
    const res = await api().get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("Token בפורמט שגוי: 401", async () => {
    expect((await api().get("/api/auth/me").set("Authorization", "Token abc")).status).toBe(401);
    expect((await api().get("/api/auth/me").set("Authorization", "Bearer not.a.jwt")).status).toBe(401);
  });

  it("Token חתום במפתח אחר: 401", async () => {
    const { user } = await makeUser();
    const forged = jwt.sign({ role: "ADMIN" }, "some-other-secret-that-is-long-enough-123", { subject: String(user.id) });
    expect((await api().get("/api/auth/me").set("Authorization", `Bearer ${forged}`)).status).toBe(401);
  });

  it("Token שפג תוקפו: 401", async () => {
    const { user } = await makeUser();
    const expired = jwt.sign({ role: "USER", exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET!, { subject: String(user.id) });
    const res = await api().get("/api/auth/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it("Token עם alg=none נדחה", async () => {
    const { user } = await makeUser({ role: "ADMIN" });
    const none = jwt.sign({ role: "ADMIN" }, "", { algorithm: "none", subject: String(user.id) });
    expect((await api().get("/api/auth/me").set("Authorization", `Bearer ${none}`)).status).toBe(401);
  });

  it("התפקיד נקבע לפי מסד הנתונים ולא לפי ה־Token", async () => {
    const { user } = await makeUser({ role: "USER" });
    const claimsAdmin = jwt.sign({ role: "ADMIN" }, process.env.JWT_SECRET!, { subject: String(user.id) });
    const res = await api().get("/api/admin/pending").set("Authorization", `Bearer ${claimsAdmin}`);
    expect(res.status).toBe(403);
  });

  it("Token שגוי בנקודת קצה ציבורית מחזיר 401 (לא מתעלמים בשקט)", async () => {
    expect((await api().get("/api/recipes").set("Authorization", "Bearer bad")).status).toBe(401);
  });
});

describe("פרופיל", () => {
  it("עדכון פרטי קשר וניקוי שלהם", async () => {
    const { auth } = await makeUser();
    const set = await api().patch("/api/users/me").set(auth).send({ contactEmail: "Me@Contact.com", contactPhone: "050-1234567" });
    expect(set.status).toBe(200);
    expect(set.body.user).toMatchObject({ contactEmail: "me@contact.com", contactPhone: "050-1234567" });
    const clear = await api().patch("/api/users/me").set(auth).send({ contactPhone: "" });
    expect(clear.body.user.contactPhone).toBeNull();
    expect(clear.body.user.contactEmail).toBe("me@contact.com");
  });

  it("טלפון לא תקין ובקשה ריקה: 400", async () => {
    const { auth } = await makeUser();
    expect((await api().patch("/api/users/me").set(auth).send({ contactPhone: "abc" })).status).toBe(400);
    expect((await api().patch("/api/users/me").set(auth).send({})).status).toBe(400);
  });
});
