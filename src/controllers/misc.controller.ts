import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import * as admin from "../services/admin.service.js";
import * as notifications from "../services/notifications.service.js";
import { uploadImage } from "../services/uploads.service.js";
import { getValidated } from "../middleware/validate.js";
import type { ModerationBody, ModerationParams } from "../schemas/admin.js";

export async function health(_req: Request, res: Response) {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  res.status(database === "ok" ? 200 : 503).json({
    status: database === "ok" ? "ok" : "degraded",
    database,
    time: new Date().toISOString(),
  });
}

export async function upload(req: Request, res: Response) {
  res.status(201).json(await uploadImage(req.user!, req.file));
}

export async function pending(_req: Request, res: Response) {
  const { query } = getValidated<unknown, { type?: ModerationParams["type"] }>(res);
  res.json(await admin.listPending(query.type));
}

export async function moderate(_req: Request, res: Response) {
  const { params, body } = getValidated<ModerationBody, unknown, ModerationParams>(res);
  res.json(await admin.moderate(params, body));
}

export async function listNotifications(req: Request, res: Response) {
  const { query } = getValidated<unknown, { page: number; pageSize: number; unreadOnly?: boolean }>(res);
  res.json(await notifications.listNotifications(req.user!.id, query));
}

export async function readNotification(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, { id: number }>(res);
  res.json(await notifications.markRead(req.user!.id, params.id));
}

export async function readAll(req: Request, res: Response) {
  res.json(await notifications.markAllRead(req.user!.id));
}
