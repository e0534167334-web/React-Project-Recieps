import { prisma } from "../db/prisma.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signAccessToken } from "../auth/jwt.js";
import { conflict, notFound, unauthorized } from "../lib/errors.js";
import { serializeSelf } from "../lib/serializers.js";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "../schemas/auth.js";

// Hash קבוע להשוואה כשהאימייל לא קיים, כדי שזמן התגובה לא יחשוף אילו אימיילים רשומים
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-1"));

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw conflict("כתובת האימייל כבר רשומה במערכת");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password),
      role: "USER", // הרשמה דרך האתר תמיד יוצרת משתמש רגיל
    },
  });
  return { token: signAccessToken(user.id, user.role), user: serializeSelf(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw unauthorized("אימייל או סיסמה שגויים");
  return { token: signAccessToken(user.id, user.role), user: serializeSelf(user) };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("המשתמש לא נמצא");
  return { user: serializeSelf(user) };
}

export async function updateMe(userId: number, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
    },
  });
  return { user: serializeSelf(user) };
}
