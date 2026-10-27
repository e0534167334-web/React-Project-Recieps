import { z } from "zod";
import { idSchema, paginationSchema, queryBoolean } from "./common.js";

export const moderationParamsSchema = z.object({
  type: z.enum(["recipes", "questions", "answers"], { error: "type חייב להיות recipes, questions או answers" }),
  id: idSchema,
});

export const moderationBodySchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"], { error: "decision חייב להיות APPROVED או REJECTED" }),
    reason: z.string().trim().max(300).optional(),
  })
  .transform((v) => ({ ...v, reason: v.reason === "" ? undefined : v.reason }));

export const pendingQuerySchema = z.object({
  type: z.enum(["recipes", "questions", "answers"]).optional(),
});

export const notificationsQuerySchema = paginationSchema.extend({
  unreadOnly: queryBoolean,
});

export type ModerationParams = z.infer<typeof moderationParamsSchema>;
export type ModerationBody = z.infer<typeof moderationBodySchema>;
