import { createImageStorage, type ImageStorage } from "./imageStorage.js";

// האחסון הפעיל. בעליית השרת זה Supabase (או "כבוי"), בבדיקות מחליפים לאחסון בזיכרון.
let current: ImageStorage | null = null;

export function getStorage(): ImageStorage {
  if (!current) current = createImageStorage();
  return current;
}

export function setStorage(storage: ImageStorage): void {
  current = storage;
}
