import { prisma } from "../db/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { notFound } from "../lib/errors.js";
import { paging, toPage } from "../lib/pagination.js";
import { authorSelect, imageUrlFor, serializeAuthor } from "../lib/serializers.js";
import { PUBLIC_RECIPE } from "./recipes.service.js";
import type { AuthUser } from "../types/express.js";

// בספר מוצגים רק מתכונים שהמשתמש עדיין רשאי לראות:
// ציבוריים ומאושרים, או מתכונים שהוא עצמו כתב
function stillVisible(user: AuthUser): Prisma.RecipeWhereInput {
  return { OR: [PUBLIC_RECIPE, { authorId: user.id }] };
}

export async function listCookbook(user: AuthUser, q: { page: number; pageSize: number; search?: string }) {
  const recipeWhere: Prisma.RecipeWhereInput = {
    AND: [stillVisible(user), ...(q.search ? [{ title: { contains: q.search, mode: "insensitive" as const } }] : [])],
  };
  const where: Prisma.SavedRecipeWhereInput = { userId: user.id, recipe: recipeWhere };
  const [rows, total] = await Promise.all([
    prisma.savedRecipe.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paging(q.page, q.pageSize),
      include: {
        recipe: {
          include: {
            category: { select: { id: true, name: true } },
            author: { select: authorSelect },
            _count: { select: { savedBy: true } },
          },
        },
      },
    }),
    prisma.savedRecipe.count({ where }),
  ]);
  const items = rows.map(({ recipe: r, createdAt }) => ({
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
    status: r.status,
    author: serializeAuthor(r.author, r.showContact),
    saveCount: r._count.savedBy,
    isSaved: true,
    savedAt: createdAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  return toPage(items, total, q.page, q.pageSize);
}

/** מחזיר true אם נשמר עכשיו, false אם כבר היה שמור */
export async function saveToCookbook(user: AuthUser, recipeId: number): Promise<boolean> {
  const recipe = await prisma.recipe.findFirst({ where: { AND: [{ id: recipeId }, stillVisible(user)] }, select: { id: true } });
  if (!recipe) throw notFound("המתכון לא נמצא");
  const existing = await prisma.savedRecipe.findUnique({ where: { userId_recipeId: { userId: user.id, recipeId } } });
  if (existing) return false;
  await prisma.savedRecipe.create({ data: { userId: user.id, recipeId } });
  return true;
}

export async function removeFromCookbook(user: AuthUser, recipeId: number) {
  const res = await prisma.savedRecipe.deleteMany({ where: { userId: user.id, recipeId } });
  if (res.count === 0) throw notFound("המתכון לא נמצא בספר שלך");
}
