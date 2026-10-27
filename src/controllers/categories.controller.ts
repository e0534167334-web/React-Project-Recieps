import type { Request, Response } from "express";
import * as categories from "../services/categories.service.js";
import { getValidated } from "../middleware/validate.js";
import type { CategoryInput } from "../schemas/categories.js";

type IdParams = { id: number };

export async function list(_req: Request, res: Response) {
  res.json(await categories.listCategories());
}

export async function create(_req: Request, res: Response) {
  const { body } = getValidated<CategoryInput>(res);
  res.status(201).json(await categories.createCategory(body));
}

export async function update(_req: Request, res: Response) {
  const { body, params } = getValidated<CategoryInput, unknown, IdParams>(res);
  res.json(await categories.updateCategory(params.id, body));
}

export async function remove(_req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, IdParams>(res);
  await categories.deleteCategory(params.id);
  res.status(204).end();
}
