import { z } from "zod";
import "./common.js";

export const assistantBodySchema = z.object({
  message: z.string().trim().min(2, "יש לכתוב שאלה לעוזר").max(500, "השאלה ארוכה מדי (עד 500 תווים)"),
});

export type AssistantInput = z.infer<typeof assistantBodySchema>;
