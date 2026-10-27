import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { setStorage } from "../src/storage/index.js";
import { MemoryImageStorage } from "../src/storage/imageStorage.js";

const TABLES = [
  "notifications",
  "forum_answers",
  "forum_questions",
  "saved_recipes",
  "recipe_ingredients",
  "recipes",
  "categories",
  "users",
];

beforeEach(async () => {
  if (!process.env.DATABASE_URL?.includes("test")) throw new Error("הבדיקות רצות רק מול מסד נתונים של בדיקות");
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  setStorage(new MemoryImageStorage());
});

afterAll(async () => {
  await prisma.$disconnect();
});
