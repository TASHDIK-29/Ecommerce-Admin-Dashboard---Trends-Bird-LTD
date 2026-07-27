export const categorySearchableFields = ["name", "slug", "description"] as const;

export const categorySortableFields = [
  "name",
  "slug",
  "sortOrder",
  "createdAt",
  "updatedAt",
] as const;

export const categorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  imageId: true,
  parentId: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  image: { select: { id: true, url: true, thumbnailUrl: true, altText: true } },
  _count: { select: { children: true } },
} as const;

export const categoryDetailSelect = {
  ...categorySelect,
  parent: { select: { id: true, name: true, slug: true } },
  children: {
    select: { id: true, name: true, slug: true, isActive: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
  },
};
