import { describe, expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { api, makeCategory, makeUser } from "./helpers.js";
import { openApiDocument } from "../src/docs/openapi.js";
import { apiRouter } from "../src/routes/index.js";
import { prisma } from "../src/db/prisma.js";
import { extractIngredientTerms } from "../src/services/assistant.service.js";

describe("מערכת", () => {
  it("GET /api/health", async () => {
    const res = await api().get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", database: "ok" });
  });

  it("כתובת שלא קיימת: 404 במבנה אחיד", async () => {
    const res = await api().get("/api/nothing-here");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("CORS: כתובת מותרת מקבלת אישור, כתובת זרה לא", async () => {
    const ok = await api().get("/api/health").set("Origin", "http://localhost:5173");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    const bad = await api().get("/api/health").set("Origin", "https://evil.example.com");
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("Swagger", () => {
  it("/api-docs נפתח ו־/api-docs.json הוא OpenAPI תקין", async () => {
    const html = await api().get("/api-docs/");
    expect(html.status).toBe(200);
    expect(html.text).toContain("swagger-ui");
    const spec = await api().get("/api-docs.json");
    expect(spec.status).toBe(200);
    await expect(SwaggerParser.validate(structuredClone(spec.body))).resolves.toBeTruthy();
    expect(spec.body.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer", bearerFormat: "JWT" });
  });

  it("כל נקודת קצה בשרת מתועדת ב־Swagger, ולהפך", () => {
    type Layer = { route?: { path: string; methods: Record<string, boolean> } };
    const stack = (apiRouter() as unknown as { stack: Layer[] }).stack;
    const routes = stack
      .filter((l) => l.route)
      .flatMap((l) => Object.keys(l.route!.methods).map((m) => `${m.toUpperCase()} /api${l.route!.path.replace(/:(\w+)/g, "{$1}")}`))
      .sort();
    const documented = Object.entries(openApiDocument.paths)
      .flatMap(([path, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} ${path}`))
      .sort();
    expect(documented).toEqual(routes);
  });

  it("כל נקודת קצה מוגנת מסומנת כדורשת Token", async () => {
    const paths = openApiDocument.paths as unknown as Record<string, Record<string, { security?: unknown[] }>>;
    const unprotected = ["POST /api/auth/register", "POST /api/auth/login", "GET /api/health", "GET /api/categories", "GET /api/forum/stats"];
    for (const [path, ops] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(ops)) {
        const key = `${method.toUpperCase()} ${path}`;
        if (!unprotected.includes(key)) expect(op.security, key).toBeDefined();
      }
    }
  });
});

describe("Prisma ומסד הנתונים", () => {
  it("ה־Migrations הוחלו", async () => {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`;
    expect(rows.map((r) => r.migration_name)).toEqual(["20261026200000_init", "20261026200100_check_constraints"]);
  });

  it("אילוצי תקינות במסד הנתונים חוסמים ערכים לא חוקיים", async () => {
    const { user } = await makeUser();
    const cat = await makeCategory();
    await expect(
      prisma.recipe.create({
        data: { title: "בדיקה", instructions: "הוראות ארוכות מספיק", categoryId: cat.id, difficulty: "EASY", kosherType: "MEAT", prepTimeMinutes: 5000, authorId: user.id },
      }),
    ).rejects.toThrow();
    await expect(prisma.user.create({ data: { email: user.email, displayName: "כפול", passwordHash: "x" } })).rejects.toThrow();
  });

  it("מחיקת משתמש מוחקת את התוכן שלו (Cascade)", async () => {
    const { user, auth } = await makeUser();
    const cat = await makeCategory();
    await api()
      .post("/api/recipes")
      .set(auth)
      .send({ title: "מתכון", categoryId: cat.id, difficulty: "EASY", kosherType: "MEAT", ingredients: "עוף", instructions: "אופים שעה בתנור חם" })
      .expect(201);
    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.recipe.count()).toBe(0);
    expect(await prisma.recipeIngredient.count()).toBe(0);
  });
});

describe("עוזר אישי (מצב בסיסי)", () => {
  it("מזהה מצרכים מטקסט חופשי", () => {
    expect(extractIngredientTerms("יש לי ביצים, קישואים וגבינה. מה אפשר להכין?")).toEqual(["ביצ", "קישוא", "גבינ"]);
    expect(extractIngredientTerms("מה להכין?")).toEqual([]);
  });

  it("מחזיר מתכונים ציבוריים בלבד, מהמתאים ביותר", async () => {
    const { auth } = await makeUser();
    const cat = await makeCategory();
    const base = { categoryId: cat.id, difficulty: "EASY", kosherType: "DAIRY", instructions: "מערבבים ואופים חצי שעה" };
    await api().post("/api/recipes").set(auth).send({ ...base, title: "פשטידה", ingredients: "4 ביצים\n2 קישואים\nגבינה" });
    await api().post("/api/recipes").set(auth).send({ ...base, title: "חביתה", ingredients: "2 ביצים\nמלח" });
    await api().post("/api/recipes").set(auth).send({ ...base, title: "סודי", visibility: "PRIVATE", ingredients: "ביצה\nקישוא\nגבינה" });

    const res = await api().post("/api/assistant/ask").send({ message: "יש לי ביצה, קישוא וגבינה" });
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("basic");
    expect(res.body.recipes.map((r: { title: string }) => r.title)).toEqual(["פשטידה", "חביתה"]);
    expect(res.body.reply).toContain("פשטידה");
  });

  it("הודעה ריקה: 400", async () => {
    expect((await api().post("/api/assistant/ask").send({ message: "" })).status).toBe(400);
  });
});
