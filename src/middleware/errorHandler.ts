import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { AppError } from "../lib/errors.js";
import { Prisma } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

interface ErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}

function send(res: Response, status: number, body: ErrorBody) {
  res.status(status).json(body);
}

export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, { error: { code: "ROUTE_NOT_FOUND", message: `הכתובת ${req.method} ${req.path} לא קיימת` } });
}

// כל שגיאה בשרת מגיעה לכאן ומוחזרת במבנה אחיד
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return send(res, err.status, {
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  if (err instanceof ZodError) {
    return send(res, 400, {
      error: {
        code: "VALIDATION_ERROR",
        message: "נתונים לא תקינים",
        details: err.issues.map((i) => ({ field: i.path.join(".") || "(root)", message: i.message })),
      },
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return send(res, 413, {
        error: { code: "FILE_TOO_LARGE", message: `הקובץ גדול מדי. הגודל המרבי הוא ${env.MAX_IMAGE_MB}MB` },
      });
    }
    return send(res, 400, { error: { code: "UPLOAD_ERROR", message: "שגיאה בהעלאת הקובץ. יש לשלוח קובץ אחד בשדה image" } });
  }

  // JSON לא תקין בגוף הבקשה
  if (typeof err === "object" && err !== null && "type" in err && (err as { type?: string }).type === "entity.parse.failed") {
    return send(res, 400, { error: { code: "INVALID_JSON", message: "גוף הבקשה אינו JSON תקין" } });
  }
  if (typeof err === "object" && err !== null && "type" in err && (err as { type?: string }).type === "entity.too.large") {
    return send(res, 413, { error: { code: "PAYLOAD_TOO_LARGE", message: "גוף הבקשה גדול מדי" } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return send(res, 409, { error: { code: "CONFLICT", message: "ערך זה כבר קיים במערכת" } });
    if (err.code === "P2025") return send(res, 404, { error: { code: "NOT_FOUND", message: "הפריט המבוקש לא נמצא" } });
    if (err.code === "P2003") return send(res, 409, { error: { code: "CONFLICT", message: "הפעולה מתנגשת בנתונים קשורים" } });
  }

  console.error(err);
  send(res, 500, { error: { code: "INTERNAL_ERROR", message: "אירעה שגיאה פנימית בשרת" } });
}
