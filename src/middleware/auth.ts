import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/jwt.js";
import { prisma } from "../db/prisma.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import type { Role } from "../generated/prisma/enums.js";

function readBearer(req: Request): string | null | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined; // לא נשלח Token בכלל
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] ?? null; // נשלח, אבל לא בפורמט נכון
}

async function resolveUser(req: Request, token: string | null): Promise<void> {
  if (!token) throw unauthorized("ה־Token חסר או בפורמט שגוי. יש לשלוח Authorization: Bearer <token>");
  const verified = verifyAccessToken(token);
  if (!verified) throw unauthorized("ה־Token לא תקין או שפג תוקפו. יש להתחבר מחדש");

  // המשתמש נטען ממסד הנתונים בכל בקשה, כך שמשתמש שנמחק או שתפקידו שונה מזוהה מיד
  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, role: true, displayName: true },
  });
  if (!user) throw unauthorized("המשתמש של ה־Token לא קיים יותר. יש להתחבר מחדש");
  req.user = user;
}

/** חובה להיות מחובר */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  await resolveUser(req, token ?? null);
  next();
}

/** התחברות רשות: בלי Token ממשיכים כאורח, עם Token שגוי מחזירים 401 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (token !== undefined) await resolveUser(req, token);
  next();
}

/** חובה להיות מחובר עם אחד מהתפקידים */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden("פעולה זו מותרת למנהל בלבד");
    next();
  };
}
