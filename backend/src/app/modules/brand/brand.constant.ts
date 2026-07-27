export const brandSearchableFields = ["name", "slug", "description"] as const;

export const brandSortableFields = [
  "name",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const brandSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  logo: { select: { id: true, url: true, thumbnailUrl: true, altText: true } },
} as const;
