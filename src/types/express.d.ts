import type { Role } from "../generated/prisma/enums.js";

export interface AuthUser {
  id: number;
  role: Role;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      /** המשתמש המחובר, לפי ה־Token בלבד */
      user?: AuthUser;
    }
  }
}

export {};
