import "dotenv/config";
import { z } from "zod";

// כל משתני הסביבה נבדקים כאן פעם אחת, בעליית השרת.
// אם משהו חסר או שגוי, השרת לא יעלה ויכתוב בדיוק מה חסר.

const booleanFromString = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .transform((v) => v === "true" || v === "1" || v === "yes");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_URL: z
    .string({ error: "חסר DATABASE_URL: כתובת החיבור למסד הנתונים" })
    .min(1, "חסר DATABASE_URL: כתובת החיבור למסד הנתונים")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL חייב להתחיל ב־postgresql://",
    }),

  JWT_SECRET: z
    .string({ error: "חסר JWT_SECRET" })
    .min(32, "JWT_SECRET חייב להכיל לפחות 32 תווים"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "JWT_EXPIRES_IN בפורמט כמו 24h, 1d או 30m")
    .default("1d"),

  // כתובות מותרות לקריאה מהדפדפן, מופרדות בפסיק. * = כל כתובת
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3000"),

  // אחסון תמונות ב־Supabase Storage (רשות: בלעדיהם העלאת תמונות מחזירה 503)
  SUPABASE_URL: z.url().optional().or(z.literal("").transform(() => undefined)),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal("").transform(() => undefined)),
  SUPABASE_BUCKET: z.string().min(3).default("recipe-images"),
  MAX_IMAGE_MB: z.coerce.number().positive().max(20).default(5),

  // הגבלת ניסיונות התחברות והרשמה
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),

  // עוזר אישי (רשות): בלי מפתח העוזר עובד במצב בסיסי
  AI_API_KEY: z.string().optional().or(z.literal("").transform(() => undefined)),
  AI_MODEL: z.string().default("gemini-2.5-flash"),
  AI_API_URL: z.url().default("https://generativelanguage.googleapis.com/v1beta"),

  // חשבון מנהל ל־Seed בפרודקשן
  ADMIN_EMAIL: z.email().optional().or(z.literal("").transform(() => undefined)),
  ADMIN_PASSWORD: z.string().min(10).optional().or(z.literal("").transform(() => undefined)),
  ADMIN_DISPLAY_NAME: z.string().min(2).max(40).default("מנהל האתר"),
  SEED_DEMO_DATA: booleanFromString.optional().or(z.literal("").transform(() => undefined)),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    console.error("\nשגיאה בהגדרות השרת (משתני סביבה):\n" + lines.join("\n") + "\n");
    console.error("ראו את הקובץ .env.example לדוגמה.\n");
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins: string[] | "*" =
  env.CORS_ORIGINS.trim() === "*"
    ? "*"
    : env.CORS_ORIGINS.split(",")
        .map((s) => s.trim().replace(/\/$/, ""))
        .filter(Boolean);
