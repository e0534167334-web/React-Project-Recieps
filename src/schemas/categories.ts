import { z } from "zod";
import "./common.js";

export const categoryBodySchema = z.object({
  name: z.string().trim().min(2, "שם הקטגוריה חייב להכיל 2 תווים לפחות").max(40),
});

export type CategoryInput = z.infer<typeof categoryBodySchema>;
