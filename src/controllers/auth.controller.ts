import type { Request, Response } from "express";
import * as auth from "../services/auth.service.js";
import { getValidated } from "../middleware/validate.js";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "../schemas/auth.js";

export async function register(_req: Request, res: Response) {
  const { body } = getValidated<RegisterInput>(res);
  res.status(201).json(await auth.register(body));
}

export async function login(_req: Request, res: Response) {
  const { body } = getValidated<LoginInput>(res);
  res.json(await auth.login(body));
}

export async function me(req: Request, res: Response) {
  res.json(await auth.getMe(req.user!.id));
}

export async function updateMe(req: Request, res: Response) {
  const { body } = getValidated<UpdateProfileInput>(res);
  res.json(await auth.updateMe(req.user!.id, body));
}
