import { Router } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema, paginationSchema, optionalTrimmed } from "../schemas/common.js";
import { loginSchema, registerSchema, updateProfileSchema } from "../schemas/auth.js";
import { categoryBodySchema } from "../schemas/categories.js";
import {
  createRecipeSchema,
  listRecipesQuerySchema,
  myRecipesQuerySchema,
  recipeIdParamSchema,
  updateRecipeSchema,
} from "../schemas/recipes.js";
import {
  createAnswerSchema,
  createQuestionSchema,
  listQuestionsQuerySchema,
  solvedSchema,
  updateAnswerSchema,
  updateQuestionSchema,
} from "../schemas/forum.js";
import { moderationBodySchema, moderationParamsSchema, notificationsQuerySchema, pendingQuerySchema } from "../schemas/admin.js";
import { assistantBodySchema } from "../schemas/assistant.js";
import * as authC from "../controllers/auth.controller.js";
import * as catC from "../controllers/categories.controller.js";
import * as recC from "../controllers/recipes.controller.js";
import * as forumC from "../controllers/forum.controller.js";
import * as misc from "../controllers/misc.controller.js";
import * as assistantC from "../controllers/assistant.controller.js";

const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות" } },
});

const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "יותר מדי שאלות לעוזר. נסו שוב בעוד דקה" } },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_IMAGE_MB * 1024 * 1024, files: 1 },
});

export function apiRouter(): Router {
  const r = Router();
  const admin = [requireAuth, requireRole("ADMIN")];

  r.get("/health", misc.health);

  // התחברות ופרופיל
  r.post("/auth/register", authLimiter, validate({ body: registerSchema }), authC.register);
  r.post("/auth/login", authLimiter, validate({ body: loginSchema }), authC.login);
  r.get("/auth/me", requireAuth, authC.me);
  r.patch("/users/me", requireAuth, validate({ body: updateProfileSchema }), authC.updateMe);

  // קטגוריות
  r.get("/categories", catC.list);
  r.post("/categories", ...admin, validate({ body: categoryBodySchema }), catC.create);
  r.patch("/categories/:id", ...admin, validate({ params: idParamSchema, body: categoryBodySchema }), catC.update);
  r.delete("/categories/:id", ...admin, validate({ params: idParamSchema }), catC.remove);

  // תמונות
  r.post("/uploads/image", requireAuth, upload.single("image"), misc.upload);

  // מתכונים
  r.get("/recipes", optionalAuth, validate({ query: listRecipesQuerySchema }), recC.list);
  r.get("/recipes/mine", requireAuth, validate({ query: myRecipesQuerySchema }), recC.mine);
  r.get("/recipes/:id", optionalAuth, validate({ params: idParamSchema }), recC.get);
  r.post("/recipes", requireAuth, validate({ body: createRecipeSchema }), recC.create);
  r.patch("/recipes/:id", requireAuth, validate({ params: idParamSchema, body: updateRecipeSchema }), recC.update);
  r.delete("/recipes/:id", requireAuth, validate({ params: idParamSchema }), recC.remove);

  // הספר שלי
  r.get("/cookbook", requireAuth, validate({ query: paginationSchema.extend({ search: optionalTrimmed(100) }) }), recC.listCookbook);
  r.post("/cookbook/:recipeId", requireAuth, validate({ params: recipeIdParamSchema }), recC.save);
  r.delete("/cookbook/:recipeId", requireAuth, validate({ params: recipeIdParamSchema }), recC.unsave);

  // פורום
  r.get("/forum/questions", optionalAuth, validate({ query: listQuestionsQuerySchema }), forumC.listQuestions);
  r.get("/forum/stats", forumC.stats);
  r.get("/forum/questions/:id", optionalAuth, validate({ params: idParamSchema }), forumC.getQuestion);
  r.get("/forum/questions/:id/answers", optionalAuth, validate({ params: idParamSchema }), forumC.listAnswers);
  r.post("/forum/questions", requireAuth, validate({ body: createQuestionSchema }), forumC.createQuestion);
  r.patch("/forum/questions/:id", requireAuth, validate({ params: idParamSchema, body: updateQuestionSchema }), forumC.updateQuestion);
  r.patch("/forum/questions/:id/solved", requireAuth, validate({ params: idParamSchema, body: solvedSchema }), forumC.setSolved);
  r.delete("/forum/questions/:id", requireAuth, validate({ params: idParamSchema }), forumC.deleteQuestion);
  r.post("/forum/questions/:id/answers", requireAuth, validate({ params: idParamSchema, body: createAnswerSchema }), forumC.createAnswer);
  r.patch("/forum/answers/:id", requireAuth, validate({ params: idParamSchema, body: updateAnswerSchema }), forumC.updateAnswer);
  r.delete("/forum/answers/:id", requireAuth, validate({ params: idParamSchema }), forumC.deleteAnswer);

  // התראות
  r.get("/notifications", requireAuth, validate({ query: notificationsQuerySchema }), misc.listNotifications);
  r.patch("/notifications/read-all", requireAuth, misc.readAll);
  r.patch("/notifications/:id/read", requireAuth, validate({ params: idParamSchema }), misc.readNotification);

  // ניהול
  r.get("/admin/pending", ...admin, validate({ query: pendingQuerySchema }), misc.pending);
  r.patch("/admin/moderation/:type/:id", ...admin, validate({ params: moderationParamsSchema, body: moderationBodySchema }), misc.moderate);

  // עוזר אישי (תוספת)
  r.post("/assistant/ask", assistantLimiter, optionalAuth, validate({ body: assistantBodySchema }), assistantC.ask);

  return r;
}
