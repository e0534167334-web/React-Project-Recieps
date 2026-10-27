import { z } from "zod";
import { idSchema, imagePathSchema, optionalTrimmed, paginationSchema, queryBoolean, videoUrlSchema } from "./common.js";

const nullableId = z.union([idSchema, z.null()]).optional();

export const createQuestionSchema = z.object({
  title: z.string().trim().min(5, "כותרת השאלה חייבת להכיל 5 תווים לפחות").max(150),
  body: z.string().trim().min(10, "תוכן השאלה חייב להכיל 10 תווים לפחות").max(5000),
  categoryId: nullableId,
  recipeId: nullableId,
  imagePath: imagePathSchema,
  videoUrl: videoUrlSchema,
  showContact: z.boolean().default(false),
});

export const updateQuestionSchema = z
  .object({
    title: z.string().trim().min(5).max(150).optional(),
    body: z.string().trim().min(10).max(5000).optional(),
    categoryId: nullableId,
    recipeId: nullableId,
    imagePath: imagePathSchema,
    videoUrl: videoUrlSchema,
    showContact: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "יש לשלוח לפחות שדה אחד לעדכון" });

export const solvedSchema = z.object({ isSolved: z.boolean({ error: "isSolved חייב להיות true או false" }) });

export const createAnswerSchema = z.object({
  body: z.string().trim().min(2, "התשובה חייבת להכיל 2 תווים לפחות").max(5000),
  imagePath: imagePathSchema,
  videoUrl: videoUrlSchema,
  showContact: z.boolean().default(false),
});

export const updateAnswerSchema = z
  .object({
    body: z.string().trim().min(2).max(5000).optional(),
    imagePath: imagePathSchema,
    videoUrl: videoUrlSchema,
    showContact: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "יש לשלוח לפחות שדה אחד לעדכון" });

export const listQuestionsQuerySchema = paginationSchema.extend({
  search: optionalTrimmed(100),
  categoryId: idSchema.optional(),
  solved: queryBoolean,
  unanswered: queryBoolean,
  sort: z.enum(["newest", "oldest"]).default("newest"),
  // visible = ברירת מחדל: שאלות מאושרות, ולמחובר גם שלו בכל סטטוס
  // all = כל השאלות בכל סטטוס (מנהל בלבד)
  scope: z.enum(["visible", "all"]).default("visible"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type CreateAnswerInput = z.infer<typeof createAnswerSchema>;
export type UpdateAnswerInput = z.infer<typeof updateAnswerSchema>;
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
