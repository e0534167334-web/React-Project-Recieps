import { prisma } from "../db/prisma.js";
import { notFound } from "../lib/errors.js";
import { paging, toPage } from "../lib/pagination.js";
import type { NotificationType } from "../generated/prisma/enums.js";

type EntityType = "recipe" | "question" | "answer";

export async function notify(userId: number, type: NotificationType, message: string, entityType: EntityType, entityId: number) {
  await prisma.notification.create({
    data: { userId, type, message: message.slice(0, 300), entityType, entityId },
  });
}

function serialize(n: {
  id: number;
  type: string;
  message: string;
  entityType: string;
  entityId: number;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    id: n.id,
    type: n.type,
    message: n.message,
    entityType: n.entityType,
    entityId: n.entityId,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

export async function listNotifications(userId: number, opts: { page: number; pageSize: number; unreadOnly?: boolean }) {
  const where = { userId, ...(opts.unreadOnly ? { isRead: false } : {}) };
  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...paging(opts.page, opts.pageSize),
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { ...toPage(rows.map(serialize), total, opts.page, opts.pageSize), unreadCount };
}

export async function markRead(userId: number, id: number) {
  const n = await prisma.notification.findFirst({ where: { id, userId } });
  if (!n) throw notFound("ההתראה לא נמצאה"); // גם התראה של משתמש אחר מחזירה 404
  const updated = n.isRead ? n : await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return { notification: serialize(updated) };
}

export async function markAllRead(userId: number) {
  const res = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return { updated: res.count };
}
