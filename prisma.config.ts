import "dotenv/config";
import { defineConfig } from "prisma/config";

// הגדרות Prisma: מיקום הסכמה, ה־Migrations וסקריפט ה־Seed.
// כתובת מסד הנתונים נלקחת ממשתנה הסביבה DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // בזמן build אין עדיין חיבור, ולכן ערך זמני מספיק ל־prisma generate
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
