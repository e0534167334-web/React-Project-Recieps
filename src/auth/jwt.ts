import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/enums.js";

export interface TokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(userId: number, role: Role): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    algorithm: "HS256",
  };
  return jwt.sign({ role }, env.JWT_SECRET, { ...options, subject: String(userId) });
}

/** מחזיר את מזהה המשתמש מתוך Token תקין, או null אם ה־Token לא תקין או שפג תוקפו */
export function verifyAccessToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded !== "object" || decoded === null || typeof decoded.sub !== "string") return null;
    const userId = Number(decoded.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    return { userId };
  } catch {
    return null;
  }
}
