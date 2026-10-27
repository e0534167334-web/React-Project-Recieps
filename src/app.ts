import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { corsOrigins } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { openApiDocument } from "./docs/openapi.js";
import { setStorage } from "./storage/index.js";
import type { ImageStorage } from "./storage/imageStorage.js";

export interface AppOptions {
  /** החלפת אחסון התמונות (בבדיקות) */
  storage?: ImageStorage;
}

export function createApp(options: AppOptions = {}): Express {
  if (options.storage) setStorage(options.storage);

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Render ושירותי ענן אחרים עובדים מאחורי Proxy

  // ה־API מחזיר JSON בלבד, ולכן מדיניות CSP לא נדרשת (וכך Swagger UI עובד)
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: corsOrigins === "*" ? true : corsOrigins,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "200kb" }));

  app.get("/", (_req, res) => {
    res.json({ name: "שיתוף מתכונים – API", docs: "/api-docs", health: "/api/health" });
  });

  app.get("/api-docs.json", (_req, res) => res.json(openApiDocument));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "שיתוף מתכונים – API",
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    }),
  );

  app.use("/api", apiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
