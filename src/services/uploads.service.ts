import { AppError, badRequest } from "../lib/errors.js";
import { detectImageType } from "../storage/imageStorage.js";
import { getStorage } from "../storage/index.js";
import type { AuthUser } from "../types/express.js";

export async function uploadImage(user: AuthUser, file: Express.Multer.File | undefined) {
  const storage = getStorage();
  if (!storage.enabled) await storage.upload(user.id, Buffer.alloc(0), "jpg", ""); // זורק 503 עם הסבר
  if (!file) throw badRequest("לא נשלח קובץ. יש לשלוח תמונה בשדה image (multipart/form-data)");

  const type = detectImageType(file.buffer);
  if (!type) throw new AppError(415, "UNSUPPORTED_FILE_TYPE", "סוג הקובץ לא נתמך. אפשר להעלות JPG, PNG או WEBP");

  const { path, url } = await storage.upload(user.id, file.buffer, type.ext, type.contentType);
  return { imagePath: path, imageUrl: url };
}
