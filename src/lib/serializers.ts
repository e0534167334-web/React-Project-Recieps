// המרת רשומות ממסד הנתונים לתשובות API.
// כאן נקבע מה מוצג למי: סיסמאות ואימייל התחברות לא יוצאים לעולם,
// ופרטי קשר מוצגים רק כשהכותב בחר בכך.

import type { AuthUser } from "../types/express.js";
import { getStorage } from "../storage/index.js";

export interface AuthorRow {
  id: number;
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

export const authorSelect = { id: true, displayName: true, contactEmail: true, contactPhone: true } as const;

export function serializeAuthor(author: AuthorRow, showContact: boolean) {
  return showContact
    ? { id: author.id, displayName: author.displayName, contactEmail: author.contactEmail, contactPhone: author.contactPhone }
    : { id: author.id, displayName: author.displayName };
}

export function imageUrlFor(imagePath: string | null): string | null {
  if (!imagePath) return null;
  try {
    return getStorage().publicUrl(imagePath);
  } catch {
    return null;
  }
}

export function serializeSelf(user: {
  id: number;
  email: string;
  displayName: string;
  role: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    contactEmail: user.contactEmail,
    contactPhone: user.contactPhone,
    createdAt: user.createdAt,
  };
}

/** שדות שרק הכותב והמנהל רואים */
export function moderationFields(
  row: { status: string; rejectionReason: string | null; authorId: number },
  viewer?: AuthUser,
) {
  const privileged = viewer && (viewer.id === row.authorId || viewer.role === "ADMIN");
  return privileged ? { status: row.status, rejectionReason: row.rejectionReason } : { status: row.status };
}
