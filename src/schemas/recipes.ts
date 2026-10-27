import { z } from "zod";
import { imagePathSchema, idSchema, nullableTrimmed, paginationSchema, optionalTrimmed, videoUrlSchema } from "./common.js";

const difficulty = z.enum(["EASY", "MEDIUM", "HARD"], { error: "רמת קושי: EASY, MEDIUM או HARD" });
const kosherType = z.enum(["MEAT", "DAIRY", "PAREVE"], { error: "סוג: MEAT, DAIRY או PAREVE" });
const visibility = z.enum(["PUBLIC", "PRIVATE"], { error: "נראות: PUBLIC או PRIVATE" });
const moderationStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]);

/**
 * רכיבים: טקסט עם שורה לכל רכיב (או מערך של מחרוזות).
 * שורות ריקות נמחקות, רווחים ותבליטים בתחילת שורה מנוקים.
 */
export const ingredientsSchema = z
  .union([z.string().max(20000), z.array(z.string().max(500)).max(200)], {
    error: "יש לשלוח את הרכיבים כטקסט עם שורה לכל רכיב",
  })
  .transform((v) => (Array.isArray(v) ? v : v.split(/\r?\n/)))
  .transform((lines) => lines.map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s+/, "").trim()).filter((l) => l.length > 0))
  .pipe(
    z
      .array(z.string().max(200, "כל רכיב יכול להכיל עד 200 תווים"))
      .min(1, "יש להזין לפחות רכיב אחד")
      .max(100, "אפשר להזין עד 100 רכיבים"),
  );

const prepTime = z.union([z.number().int().min(1).max(1440), z.null()], { error: "זמן הכנה: מספר דקות בין 1 ל־1440" });
const servings = z.union([z.number().int().min(1).max(100), z.null()], { error: "מספר מנות: בין 1 ל־100" });

export const createRecipeSchema = z.object({
  title: z.string().trim().min(2, "שם המתכון חייב להכיל 2 תווים לפחות").max(100),
  description: nullableTrimmed(500),
  categoryId: idSchema,
  difficulty,
  kosherType,
  prepTimeMinutes: prepTime.optional(),
  servings: servings.optional(),
  ingredients: ingredientsSchema,
  instructions: z.string().trim().min(10, "אופן ההכנה חייב להכיל 10 תווים לפחות").max(10000),
  imagePath: imagePathSchema,
  videoUrl: videoUrlSchema,
  visibility: visibility.default("PUBLIC"),
  showContact: z.boolean().default(false),
});

export const updateRecipeSchema = z
  .object({
    title: z.string().trim().min(2).max(100).optional(),
    description: nullableTrimmed(500),
    categoryId: idSchema.optional(),
    difficulty: difficulty.optional(),
    kosherType: kosherType.optional(),
    prepTimeMinutes: prepTime.optional(),
    servings: servings.optional(),
    ingredients: ingredientsSchema.optional(),
    instructions: z.string().trim().min(10).max(10000).optional(),
    imagePath: imagePathSchema,
    videoUrl: videoUrlSchema,
    visibility: visibility.optional(),
    showContact: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "יש לשלוח לפחות שדה אחד לעדכון" });

const ingredientTerms = z
  .string()
  .max(300)
  .transform((v) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
  )
  .pipe(z.array(z.string().max(50)).max(10, "אפשר לסנן לפי עד 10 מצרכים"))
  .optional();

export const listRecipesQuerySchema = paginationSchema.extend({
  search: optionalTrimmed(100),
  categoryId: idSchema.optional(),
  difficulty: difficulty.optional(),
  kosherType: kosherType.optional(),
  maxPrepTime: z.coerce.number().int().min(1).max(1440).optional(),
  ingredients: ingredientTerms,
  sort: z.enum(["newest", "prepTime", "mostSaved"]).default("newest"),
  // public = ציבוריים מאושרים (ברירת מחדל)
  // visible = כל מה שהמחובר רשאי לראות: שלו + הציבוריים (למנהל: הכול)
  // all = כל המתכונים במערכת (מנהל בלבד)
  scope: z.enum(["public", "visible", "all"]).default("public"),
  status: moderationStatus.optional(),
  visibility: visibility.optional(),
});

export const myRecipesQuerySchema = paginationSchema.extend({
  search: optionalTrimmed(100),
  status: moderationStatus.optional(),
  visibility: visibility.optional(),
});

export const recipeIdParamSchema = z.object({ recipeId: idSchema });

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
export type MyRecipesQuery = z.infer<typeof myRecipesQuerySchema>;
