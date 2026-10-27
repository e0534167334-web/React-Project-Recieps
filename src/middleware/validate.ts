import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

// ולידציה של body, query ו־params לפי סכמות Zod.
// הערכים אחרי הוולידציה (כולל המרות טיפוסים) נשמרים ב־res.locals.

export interface Validated<B = unknown, Q = unknown, P = unknown> {
  body: B;
  query: Q;
  params: P;
}

export function validate(schemas: { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const out: Validated = {
      body: schemas.body ? schemas.body.parse(req.body ?? {}) : req.body,
      query: schemas.query ? schemas.query.parse(req.query) : req.query,
      params: schemas.params ? schemas.params.parse(req.params) : req.params,
    };
    res.locals.validated = out;
    next();
  };
}

export function getValidated<B = unknown, Q = unknown, P = unknown>(res: Response): Validated<B, Q, P> {
  return res.locals.validated as Validated<B, Q, P>;
}
