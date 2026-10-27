import type { Request, Response } from "express";
import * as recipes from "../services/recipes.service.js";
import * as cookbook from "../services/cookbook.service.js";
import { getValidated } from "../middleware/validate.js";
import type { CreateRecipeInput, ListRecipesQuery, MyRecipesQuery, UpdateRecipeInput } from "../schemas/recipes.js";

type IdParams = { id: number };
type RecipeIdParams = { recipeId: number };

export async function list(req: Request, res: Response) {
  const { query } = getValidated<unknown, ListRecipesQuery>(res);
  res.json(await recipes.listPublicRecipes(query, req.user));
}

export async function mine(req: Request, res: Response) {
  const { query } = getValidated<unknown, MyRecipesQuery>(res);
  res.json(await recipes.listMyRecipes(query, req.user!));
}

export async function get(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, IdParams>(res);
  res.json(await recipes.getRecipe(params.id, req.user));
}

export async function create(req: Request, res: Response) {
  const { body } = getValidated<CreateRecipeInput>(res);
  res.status(201).json(await recipes.createRecipe(body, req.user!));
}

export async function update(req: Request, res: Response) {
  const { body, params } = getValidated<UpdateRecipeInput, unknown, IdParams>(res);
  res.json(await recipes.updateRecipe(params.id, body, req.user!));
}

export async function remove(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, IdParams>(res);
  await recipes.deleteRecipe(params.id, req.user!);
  res.status(204).end();
}

// ---- הספר שלי ----

export async function listCookbook(req: Request, res: Response) {
  const { query } = getValidated<unknown, { page: number; pageSize: number; search?: string }>(res);
  res.json(await cookbook.listCookbook(req.user!, query));
}

export async function save(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, RecipeIdParams>(res);
  const created = await cookbook.saveToCookbook(req.user!, params.recipeId);
  res.status(created ? 201 : 200).json({ saved: true, recipeId: params.recipeId });
}

export async function unsave(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, RecipeIdParams>(res);
  await cookbook.removeFromCookbook(req.user!, params.recipeId);
  res.status(204).end();
}
