import { prisma } from "../db/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { badRequest, forbidden, notFound, unauthorized } from "../lib/errors.js";
import { assertOwnImage, isAdmin, moderationStatusFor } from "../lib/moderation.js";
import { paging, toPage } from "../lib/pagination.js";
import { authorSelect, imageUrlFor, moderationFields, serializeAuthor } from "../lib/serializers.js";
import { getStorage } from "../storage/index.js";
import { stemHebrew } from "../lib/hebrew.js";
import { assertCategoryExists } from "./categories.service.js";
import type { AuthUser } from "../types/express.js";
import type { CreateRecipeInput, ListRecipesQuery, MyRecipesQuery, UpdateRecipeInput } from "../schemas/recipes.js";

/** מתכון ציבורי שאושר: מה שכל אחד רואה */
export const PUBLIC_RECIPE: Prisma.RecipeWhereInput = { status: "APPROVED", visibility: "PUBLIC" };

/** אילו מתכונים גלויים לצופה מסוים (לצפייה בודדת) */
export function visibleRecipeWhere(viewer?: AuthUser): Prisma.RecipeWhereInput {
  if (!viewer) return PUBLIC_RECIPE;
  if (viewer.role === "ADMIN") return {};
  return { OR: [PUBLIC_RECIPE, { authorId: viewer.id }] };
}

function includeFor(viewer: AuthUser | undefined, detail: boolean) {
  return {
    category: { select: { id: true, name: true } },
    author: { select: authorSelect },
    _count: { select: { savedBy: true } },
    ...(viewer ? { savedBy: { where: { userId: viewer.id }, select: { userId: true } } } : {}),
    ...(detail ? { ingredients: { orderBy: { position: "asc" as const }, select: { text: true } } } : {}),
  } satisfies Prisma.RecipeInclude;
}

type RecipeRow = Prisma.RecipeGetPayload<{
  include: {
    category: { select: { id: true; name: true } };
    author: { select: typeof authorSelect };
    _count: { select: { savedBy: true } };
  };
}> & { savedBy?: { userId: number }[]; ingredients?: { text: string }[] };

function serializeRecipe(r: RecipeRow, viewer: AuthUser | undefined, detail: boolean) {
  const isOwner = viewer?.id === r.authorId;
  const base = {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    difficulty: r.difficulty,
    kosherType: r.kosherType,
    prepTimeMinutes: r.prepTimeMinutes,
    servings: r.servings,
    imageUrl: imageUrlFor(r.imagePath),
    visibility: r.visibility,
    ...moderationFields(r, viewer),
    author: serializeAuthor(r.author, r.showContact),
    saveCount: r._count.savedBy,
    isSaved: viewer ? (r.savedBy?.length ?? 0) > 0 : false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
  if (!detail) return base;
  return {
    ...base,
    ingredients: (r.ingredients ?? []).map((i) => i.text),
    instructions: r.instructions,
    imagePath: isOwner ? r.imagePath : undefined,
    videoUrl: r.videoUrl,
    showContact: r.showContact,
    permissions: { canEdit: isOwner, canDelete: isOwner || isAdmin(viewer) },
  };
}

function filtersWhere(q: { search?: string; categoryId?: number; difficulty?: ListRecipesQuery["difficulty"]; kosherType?: ListRecipesQuery["kosherType"]; maxPrepTime?: number; ingredients?: string[] }): Prisma.RecipeWhereInput[] {
  const and: Prisma.RecipeWhereInput[] = [];
  if (q.search) {
    and.push({
      OR: [
        { title: { contains: q.search, mode: "insensitive" } },
        { description: { contains: q.search, mode: "insensitive" } },
      ],
    });
  }
  if (q.categoryId) and.push({ categoryId: q.categoryId });
  if (q.difficulty) and.push({ difficulty: q.difficulty });
  if (q.kosherType) and.push({ kosherType: q.kosherType });
  if (q.maxPrepTime) and.push({ prepTimeMinutes: { lte: q.maxPrepTime } });
  // כל מצרך שנבחר חייב להופיע לפחות באחד מרכיבי המתכון.
  // המילה מקוצרת כך ש"ביצים" ימצא גם "ביצה" ולהפך.
  for (const term of q.ingredients ?? []) {
    and.push({ ingredients: { some: { text: { contains: stemHebrew(term), mode: "insensitive" } } } });
  }
  return and;
}

function orderFor(sort: ListRecipesQuery["sort"]): Prisma.RecipeOrderByWithRelationInput[] {
  switch (sort) {
    case "prepTime":
      return [{ prepTimeMinutes: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }];
    case "mostSaved":
      return [{ savedBy: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

function scopeWhere(q: ListRecipesQuery, viewer?: AuthUser): Prisma.RecipeWhereInput[] {
  if (q.scope === "public") {
    if (q.status || q.visibility) throw badRequest("סינון לפי status או visibility אפשרי רק עם scope=visible או scope=all");
    return [PUBLIC_RECIPE];
  }
  if (!viewer) throw unauthorized(`scope=${q.scope} דורש התחברות`);
  if (q.scope === "all" && !isAdmin(viewer)) throw forbidden("scope=all מותר למנהל בלבד");
  return [
    visibleRecipeWhere(viewer),
    ...(q.status ? [{ status: q.status }] : []),
    ...(q.visibility ? [{ visibility: q.visibility }] : []),
  ];
}

export async function listPublicRecipes(q: ListRecipesQuery, viewer?: AuthUser) {
  const where: Prisma.RecipeWhereInput = { AND: [...scopeWhere(q, viewer), ...filtersWhere(q)] };
  const [rows, total] = await Promise.all([
    prisma.recipe.findMany({ where, include: includeFor(viewer, false), orderBy: orderFor(q.sort), ...paging(q.page, q.pageSize) }),
    prisma.recipe.count({ where }),
  ]);
  return toPage(rows.map((r) => serializeRecipe(r, viewer, false)), total, q.page, q.pageSize);
}

export async function listMyRecipes(q: MyRecipesQuery, user: AuthUser) {
  const where: Prisma.RecipeWhereInput = {
    AND: [
      { authorId: user.id },
      ...(q.status ? [{ status: q.status }] : []),
      ...(q.visibility ? [{ visibility: q.visibility }] : []),
      ...filtersWhere({ search: q.search }),
    ],
  };
  const [rows, total] = await Promise.all([
    prisma.recipe.findMany({ where, include: includeFor(user, false), orderBy: [{ updatedAt: "desc" }, { id: "desc" }], ...paging(q.page, q.pageSize) }),
    prisma.recipe.count({ where }),
  ]);
  return toPage(rows.map((r) => serializeRecipe(r, user, false)), total, q.page, q.pageSize);
}

async function loadVisible(id: number, viewer?: AuthUser) {
  const r = await prisma.recipe.findFirst({ where: { AND: [{ id }, visibleRecipeWhere(viewer)] }, include: includeFor(viewer, true) });
  if (!r) throw notFound("המתכון לא נמצא");
  return r;
}

export async function getRecipe(id: number, viewer?: AuthUser) {
  return { recipe: serializeRecipe(await loadVisible(id, viewer), viewer, true) };
}

export async function createRecipe(input: CreateRecipeInput, user: AuthUser) {
  await assertCategoryExists(input.categoryId);
  assertOwnImage(user, input.imagePath);
  const imagePath = input.imagePath ?? null;
  const videoUrl = input.videoUrl ?? null;

  const created = await prisma.recipe.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      categoryId: input.categoryId,
      difficulty: input.difficulty,
      kosherType: input.kosherType,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      servings: input.servings ?? null,
      instructions: input.instructions,
      imagePath,
      imageUrl: imageUrlFor(imagePath),
      videoUrl,
      visibility: input.visibility,
      showContact: input.showContact,
      status: moderationStatusFor(input.visibility === "PUBLIC", imagePath, videoUrl),
      authorId: user.id,
      ingredients: { create: input.ingredients.map((text, position) => ({ text, position })) },
    },
  });
  return getRecipe(created.id, user);
}

export async function updateRecipe(id: number, input: UpdateRecipeInput, user: AuthUser) {
  const existing = await loadVisible(id, user);
  if (existing.authorId !== user.id) throw forbidden("אפשר לערוך רק מתכונים שכתבת");
  if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);
  if (input.imagePath !== undefined) assertOwnImage(user, input.imagePath);

  const imagePath = input.imagePath !== undefined ? input.imagePath : existing.imagePath;
  const videoUrl = input.videoUrl !== undefined ? input.videoUrl : existing.videoUrl;
  const visibility = input.visibility ?? existing.visibility;

  await prisma.$transaction(async (tx) => {
    if (input.ingredients) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      await tx.recipeIngredient.createMany({
        data: input.ingredients.map((text, position) => ({ recipeId: id, text, position })),
      });
    }
    await tx.recipe.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
        ...(input.kosherType !== undefined ? { kosherType: input.kosherType } : {}),
        ...(input.prepTimeMinutes !== undefined ? { prepTimeMinutes: input.prepTimeMinutes } : {}),
        ...(input.servings !== undefined ? { servings: input.servings } : {}),
        ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
        ...(input.showContact !== undefined ? { showContact: input.showContact } : {}),
        imagePath,
        imageUrl: imageUrlFor(imagePath),
        videoUrl,
        visibility,
        // כל עריכה מפעילה מחדש את כלל האישור
        status: moderationStatusFor(visibility === "PUBLIC", imagePath, videoUrl),
        rejectionReason: null,
      },
    });
  });

  if (existing.imagePath && existing.imagePath !== imagePath) await getStorage().remove(existing.imagePath);
  return getRecipe(id, user);
}

export async function deleteRecipe(id: number, user: AuthUser) {
  const existing = await loadVisible(id, user);
  if (existing.authorId !== user.id && !isAdmin(user)) throw forbidden("אפשר למחוק רק מתכונים שכתבת");
  await prisma.recipe.delete({ where: { id } });
  if (existing.imagePath) await getStorage().remove(existing.imagePath);
}
