import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { hashPassword } from "../src/auth/password.js";
import { signAccessToken } from "../src/auth/jwt.js";

export const app = createApp();
export const api = () => request(app);

export const PASSWORD = "Password123";

let counter = 0;

export async function makeUser(opts: { role?: "USER" | "ADMIN"; name?: string; contactEmail?: string; contactPhone?: string } = {}) {
  counter += 1;
  const user = await prisma.user.create({
    data: {
      email: `user${counter}-${Date.now()}@test.com`,
      displayName: opts.name ?? `משתמש ${counter}`,
      passwordHash: await hashPassword(PASSWORD),
      role: opts.role ?? "USER",
      contactEmail: opts.contactEmail ?? null,
      contactPhone: opts.contactPhone ?? null,
    },
  });
  const token = signAccessToken(user.id, user.role);
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

export async function makeCategory(name = "עוגות") {
  return prisma.category.create({ data: { name } });
}

export function recipeBody(categoryId: number, extra: Record<string, unknown> = {}) {
  return {
    title: "עוגת תפוזים",
    description: "עוגה בחושה",
    categoryId,
    difficulty: "EASY",
    kosherType: "PAREVE",
    prepTimeMinutes: 50,
    servings: 10,
    ingredients: "3 ביצים\n1 כוס סוכר\n2 כוסות קמח\n1 כוס מיץ תפוזים",
    instructions: "מערבבים הכול ואופים 40 דקות ב־180 מעלות.",
    ...extra,
  };
}

/** תמונת PNG זעירה ותקינה */
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
