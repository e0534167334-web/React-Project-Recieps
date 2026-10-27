import { prisma } from "../db/prisma.js";
import { conflict, notFound } from "../lib/errors.js";
import type { CategoryInput } from "../schemas/categories.js";

export async function listCategories() {
  const rows = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { recipes: { where: { status: "APPROVED", visibility: "PUBLIC" } } } },
    },
  });
  return rows.map((c) => ({ id: c.id, name: c.name, recipeCount: c._count.recipes }));
}

async function assertNameFree(name: string, exceptId?: number) {
  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (existing) throw conflict("כבר קיימת קטגוריה בשם הזה");
}

export async function createCategory(input: CategoryInput) {
  await assertNameFree(input.name);
  const c = await prisma.category.create({ data: { name: input.name } });
  return { category: { id: c.id, name: c.name } };
}

export async function updateCategory(id: number, input: CategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound("הקטגוריה לא נמצאה");
  await assertNameFree(input.name, id);
  const c = await prisma.category.update({ where: { id }, data: { name: input.name } });
  return { category: { id: c.id, name: c.name } };
}

export async function deleteCategory(id: number) {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { recipes: true } } },
  });
  if (!existing) throw notFound("הקטגוריה לא נמצאה");
  if (existing._count.recipes > 0) {
    throw conflict(`אי אפשר למחוק קטגוריה שיש בה מתכונים (${existing._count.recipes}). יש להעביר אותם לקטגוריה אחרת קודם`);
  }
  // שאלות בפורום שקושרו לקטגוריה נשארות, בלי קטגוריה
  await prisma.category.delete({ where: { id } });
}

export async function assertCategoryExists(id: number) {
  const c = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!c) throw notFound("הקטגוריה שנבחרה לא קיימת");
}
