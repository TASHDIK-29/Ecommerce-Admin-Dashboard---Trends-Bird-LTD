export const mediaSearchableFields = ["fileName", "title", "altText"] as const;

export const mediaSortableFields = [
  "fileName",
  "size",
  "type",
  "createdAt",
  "updatedAt",
] as const;

export const mediaSelect = {
  id: true,
  fileName: true,
  url: true,
  thumbnailUrl: true,
  mimeType: true,
  type: true,
  size: true,
  width: true,
  height: true,
  altText: true,
  title: true,
  uploadedById: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: { select: { id: true, name: true, email: true } },
} as const;
