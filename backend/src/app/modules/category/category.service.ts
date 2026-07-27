import { StatusCodes } from "http-status-codes";

import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import { buildListQuery, buildMeta } from "../../utils/buildListQuery";
import { generateUniqueSlug } from "../../utils/slug";
import {
  categoryDetailSelect,
  categorySearchableFields,
  categorySelect,
  categorySortableFields,
} from "./category.constant";
import type {
  ICategoryListQuery,
  ICategoryTreeNode,
  ICategoryTreeQuery,
  ICreateCategoryPayload,
  IUpdateCategoryPayload,
} from "./category.interface";

const assertSlugAvailable = async (slug: string, excludeId?: string): Promise<void> => {
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (!existing || existing.id === excludeId) return;

  throw new AppError(StatusCodes.CONFLICT, `A category with the slug "${slug}" already exists.`, [
    { path: "slug", message: "This slug is already taken." },
  ]);
};

const assertImageExists = async (imageId: string): Promise<void> => {
  const image = await prisma.media.findUnique({ where: { id: imageId }, select: { id: true } });
  if (image) return;

  throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "The selected image does not exist.", [
    { path: "imageId", message: "No media with this id." },
  ]);
};

const assertParentExists = async (parentId: string): Promise<void> => {
  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (parent) return;

  throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "The selected parent category does not exist.", [
    { path: "parentId", message: "No category with this id." },
  ]);
};

const assertNoCycle = async (categoryId: string, parentId: string): Promise<void> => {
  if (categoryId === parentId) {
    throw new AppError(StatusCodes.CONFLICT, "A category cannot be its own parent.", [
      { path: "parentId", message: "A category cannot be its own parent." },
    ]);
  }

  const rows = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const parentOf = new Map(rows.map((row) => [row.id, row.parentId]));

  const visited = new Set<string>();
  let cursor: string | null | undefined = parentId;

  while (cursor) {
    if (cursor === categoryId) {
      throw new AppError(
        StatusCodes.CONFLICT,
        "That parent sits below this category, so the move would create a loop.",
        [{ path: "parentId", message: "A category cannot become its own ancestor." }],
      );
    }

    if (visited.has(cursor)) break;
    visited.add(cursor);
    cursor = parentOf.get(cursor);
  }
};

const createCategory = async (payload: ICreateCategoryPayload) => {
  const slug = payload.slug
    ? payload.slug
    : await generateUniqueSlug(payload.name, async (candidate) =>
        Boolean(await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })),
      );

  await assertSlugAvailable(slug);

  if (payload.parentId) await assertParentExists(payload.parentId);
  if (payload.imageId) await assertImageExists(payload.imageId);

  return prisma.category.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      imageId: payload.imageId ?? null,
      parentId: payload.parentId ?? null,
      isActive: payload.isActive ?? true,
      sortOrder: payload.sortOrder ?? 0,
    },
    select: categoryDetailSelect,
  });
};

const getCategories = async (query: ICategoryListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: categorySearchableFields,
    sortableFields: categorySortableFields,
    filters: {
      parentId: { type: "string" },
      isActive: { type: "boolean" },
    },
    defaultSort: { sortOrder: "asc" },
  });

  const [data, total] = await prisma.$transaction([
    prisma.category.findMany({ where, orderBy, skip, take, select: categorySelect }),
    prisma.category.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

const getCategoryTree = async (query: ICategoryTreeQuery): Promise<ICategoryTreeNode[]> => {
  const where = query.isActive === undefined ? {} : { isActive: query.isActive === "true" };

  const rows = await prisma.category.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageId: true,
      parentId: true,
      isActive: true,
      sortOrder: true,
    },
  });

  const nodes = new Map<string, ICategoryTreeNode>();
  for (const row of rows) {
    nodes.set(row.id, { ...row, depth: 0, children: [] });
  }

  const roots: ICategoryTreeNode[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;

    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const applyDepth = (node: ICategoryTreeNode, depth: number): void => {
    node.depth = depth;
    for (const child of node.children) applyDepth(child, depth + 1);
  };
  for (const root of roots) applyDepth(root, 0);

  return roots;
};

const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    select: categoryDetailSelect,
  });

  if (!category) {
    throw new AppError(StatusCodes.NOT_FOUND, "Category not found.");
  }

  return category;
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, slug: true, parentId: true },
  });

  if (!category) {
    throw new AppError(StatusCodes.NOT_FOUND, "Category not found.");
  }

  if (payload.slug && payload.slug !== category.slug) {
    await assertSlugAvailable(payload.slug, id);
  }

  if (payload.imageId) await assertImageExists(payload.imageId);

  if (payload.parentId) {
    await assertParentExists(payload.parentId);
    await assertNoCycle(id, payload.parentId);
  }

  return prisma.category.update({
    where: { id },
    data: {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      imageId: payload.imageId,
      parentId: payload.parentId,
      isActive: payload.isActive,
      sortOrder: payload.sortOrder,
    },
    select: categoryDetailSelect,
  });
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { children: true } } },
  });

  if (!category) {
    throw new AppError(StatusCodes.NOT_FOUND, "Category not found.");
  }

  if (category._count.children > 0) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `"${category.name}" still has ${category._count.children} child categor(y/ies). Move or delete them first.`,
      [{ path: "id", message: `${category._count.children} child categories still reference this one.` }],
    );
  }

  await prisma.category.delete({ where: { id } });

  return { id: category.id, name: category.name };
};

export const CategoryService = {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
