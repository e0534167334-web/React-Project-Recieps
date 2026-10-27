import { z } from "zod";

// הודעות שגיאה של Zod בעברית
z.config(z.locales.he());

export const idSchema = z.coerce.number().int().positive();

export const idParamSchema = z.object({ id: idSchema });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

/** טקסט שעובר trim; מחרוזת ריקה הופכת ל־undefined (שימושי לשדות רשות בטפסים) */
export const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/** שדה רשות שאפשר גם לנקות: null או "" מוחקים את הערך */
export const nullableTrimmed = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v));

export const queryBoolean = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();

export const videoUrlSchema = z
  .union([
    z
      .url({ protocol: /^https$/, error: "קישור לסרטון חייב להיות כתובת https תקינה" })
      .max(1000),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v === "" ? null : v));

// נתיב תמונה שהתקבל מ־POST /api/uploads/image
export const imagePathSchema = z
  .union([
    z
      .string()
      .max(500)
      .regex(/^uploads\/\d+\/[a-f0-9-]{36}\.(jpg|png|webp)$/, "imagePath לא תקין. יש להשתמש בערך שהתקבל מהעלאת התמונה"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v === "" ? null : v));
