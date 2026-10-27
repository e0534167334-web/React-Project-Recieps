// שגיאה "מסודרת" שהשרת יודע להחזיר כ־JSON עם קוד HTTP מתאים

export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) =>
  new AppError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "נדרשת התחברות") => new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "אין לך הרשאה לבצע פעולה זו") => new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "הפריט המבוקש לא נמצא") => new AppError(404, "NOT_FOUND", message);

export const conflict = (message: string) => new AppError(409, "CONFLICT", message);

export const serviceUnavailable = (message: string) => new AppError(503, "SERVICE_UNAVAILABLE", message);
