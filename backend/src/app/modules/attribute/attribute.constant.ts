export const ATTRIBUTE_TYPES = [
  "DROPDOWN",
  "RADIO",
  "CHECKBOX",
  "COLOR_SWATCH",
  "IMAGE_SWATCH",
] as const;

export const COLOR_TYPE = "COLOR_SWATCH";
export const IMAGE_TYPE = "IMAGE_SWATCH";

export const attributeSearchableFields = ["name", "slug"] as const;

export const attributeSortableFields = ["name", "slug", "type", "createdAt", "updatedAt"] as const;

export const attributeValueSelect = {
  id: true,
  value: true,
  slug: true,
  colorCode: true,
  mediaId: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  media: { select: { id: true, url: true, thumbnailUrl: true, altText: true } },
} as const;

export const attributeSelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { values: true } },
};

export const attributeDetailSelect = {
  ...attributeSelect,
  values: {
    select: attributeValueSelect,
    orderBy: [{ sortOrder: "asc" as const }, { value: "asc" as const }],
  },
};
