import type { ModerationStatus } from "../generated/prisma/enums.js";
import { forbidden } from "./errors.js";
import type { AuthUser } from "../types/express.js";

/**
 * כלל האישור: תוכן ציבורי שיש בו תמונה או סרטון ממתין לאישור מנהל.
 * הכלל מופעל גם ביצירה וגם בכל עריכה, כך שכל שינוי בתוכן כזה חוזר לתור האישורים.
 */
export function moderationStatusFor(isPublic: boolean, imagePath: string | null, videoUrl: string | null): ModerationStatus {
  return isPublic && (imagePath || videoUrl) ? "PENDING" : "APPROVED";
}

/** תמונה מצורפת חייבת להיות כזו שהמשתמש עצמו העלה */
export function assertOwnImage(user: AuthUser, imagePath: string | null | undefined): void {
  if (imagePath && !imagePath.startsWith(`uploads/${user.id}/`)) {
    throw forbidden("אפשר לצרף רק תמונה שהעלית בעצמך");
  }
}

export function isAdmin(user?: AuthUser): boolean {
  return user?.role === "ADMIN";
}
