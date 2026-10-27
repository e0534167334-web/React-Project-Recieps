import type { Request, Response } from "express";
import * as assistant from "../services/assistant.service.js";
import { getValidated } from "../middleware/validate.js";
import type { AssistantInput } from "../schemas/assistant.js";

export async function ask(_req: Request, res: Response) {
  const { body } = getValidated<AssistantInput>(res);
  res.json(await assistant.ask(body.message));
}
