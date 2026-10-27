import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { serviceUnavailable } from "../lib/errors.js";

// שכבת אחסון התמונות. השרת עובד מול "ממשק" ולא מול ספק מסוים,
// כך שבבדיקות אפשר להשתמש באחסון זמני בזיכרון, ובפרודקשן ב־Supabase Storage.

export type ImageExt = "jpg" | "png" | "webp";

export interface ImageStorage {
  readonly enabled: boolean;
  upload(userId: number, data: Buffer, ext: ImageExt, contentType: string): Promise<{ path: string; url: string }>;
  publicUrl(path: string): string;
  remove(path: string): Promise<void>;
}

export function newImagePath(userId: number, ext: ImageExt): string {
  return `uploads/${userId}/${randomUUID()}.${ext}`;
}

/** מזהה את סוג התמונה לפי הבייטים הראשונים בקובץ, ולא רק לפי מה שהדפדפן הצהיר */
export function detectImageType(buf: Buffer): { ext: ImageExt; contentType: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: "png", contentType: "image/png" };
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return { ext: "webp", contentType: "image/webp" };
  return null;
}

class SupabaseImageStorage implements ImageStorage {
  readonly enabled = true;
  private client;

  constructor(
    url: string,
    key: string,
    private readonly bucket: string,
  ) {
    this.client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async upload(userId: number, data: Buffer, ext: ImageExt, contentType: string) {
    const path = newImagePath(userId, ext);
    const { error } = await this.client.storage.from(this.bucket).upload(path, data, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });
    if (error) {
      console.error("Supabase upload failed:", error.message);
      throw serviceUnavailable("העלאת התמונה לאחסון נכשלה. בדקו את הגדרות Supabase Storage");
    }
    return { path, url: this.publicUrl(path) };
  }

  publicUrl(path: string): string {
    return this.client.storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) console.warn("Supabase remove failed:", error.message);
  }
}

/** כשאין הגדרות אחסון: כל השרת עובד, רק העלאת תמונות מחזירה 503 */
class DisabledImageStorage implements ImageStorage {
  readonly enabled = false;
  async upload(): Promise<never> {
    throw serviceUnavailable("אחסון התמונות לא הוגדר בשרת (SUPABASE_URL ו־SUPABASE_SERVICE_ROLE_KEY)");
  }
  publicUrl(): string {
    throw serviceUnavailable("אחסון התמונות לא הוגדר בשרת");
  }
  async remove(): Promise<void> {}
}

/** אחסון בזיכרון, לבדיקות אוטומטיות בלבד */
export class MemoryImageStorage implements ImageStorage {
  readonly enabled = true;
  readonly files = new Map<string, Buffer>();
  async upload(userId: number, data: Buffer, ext: ImageExt) {
    const path = newImagePath(userId, ext);
    this.files.set(path, data);
    return { path, url: this.publicUrl(path) };
  }
  publicUrl(path: string): string {
    return `https://storage.test/${path}`;
  }
  async remove(path: string): Promise<void> {
    this.files.delete(path);
  }
}

export function createImageStorage(): ImageStorage {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseImageStorage(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, env.SUPABASE_BUCKET);
  }
  return new DisabledImageStorage();
}
