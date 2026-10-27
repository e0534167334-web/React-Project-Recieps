import { z } from "zod";
import "./common.js";

const email = z.string().trim().toLowerCase().pipe(z.email({ error: "כתובת אימייל לא תקינה" }).max(254));

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, "שם התצוגה חייב להכיל 2 תווים לפחות").max(40),
  email,
  password: z
    .string()
    .min(8, "הסיסמה חייבת להכיל 8 תווים לפחות")
    .max(72, "הסיסמה ארוכה מדי (עד 72 תווים)")
    .regex(/[A-Za-z֐-׿]/, "הסיסמה חייבת להכיל לפחות אות אחת")
    .regex(/\d/, "הסיסמה חייבת להכיל לפחות ספרה אחת"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "יש להזין סיסמה").max(72),
});

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{5,18}$/, "מספר טלפון לא תקין");

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(40).optional(),
    contactEmail: z
      .union([z.string().trim().toLowerCase().pipe(z.email({ error: "אימייל ליצירת קשר לא תקין" }).max(254)), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" ? null : v)),
    contactPhone: z
      .union([phone, z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "יש לשלוח לפחות שדה אחד לעדכון" });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
