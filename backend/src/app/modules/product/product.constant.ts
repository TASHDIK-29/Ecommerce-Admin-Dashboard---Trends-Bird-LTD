export const productSearchableFields = ["name", "sku", "slug"] as const;

export const productSortableFields = [
  "name",
  "sku",
  "price",
  "stock",
  "sortOrder",
  "createdAt",
  "updatedAt",
] as const;

export const mediaAttachmentSelect = {
  id: true,
  mediaId: true,
  variantId: true,
  attributeValueId: true,
  isThumbnail: true,
  isGallery: true,
  sortOrder: true,
  media: {
    select: { id: true, url: true, thumbnailUrl: true, altText: true, title: true, type: true },
  },
};

export const variantSelect = {
  id: true,
  sku: true,
  price: true,
  salePrice: true,
  stock: true,
  stockStatus: true,
  lowStockThreshold: true,
  weight: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  values: {
    select: {
      attributeValue: {
        select: {
          id: true,
          value: true,
          slug: true,
          colorCode: true,
          mediaId: true,
          attribute: { select: { id: true, name: true, slug: true, type: true } },
        },
      },
    },
  },
  media: { select: mediaAttachmentSelect },
};

export const productDetailSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  shortDescription: true,
  longDescription: true,
  hasVariants: true,
  price: true,
  salePrice: true,
  stock: true,
  stockStatus: true,
  lowStockThreshold: true,
  weight: true,
  isActive: true,
  isFeatured: true,
  sortOrder: true,
  brandId: true,
  createdAt: true,
  updatedAt: true,
  brand: { select: { id: true, name: true, slug: true, status: true } },
  categories: {
    select: { category: { select: { id: true, name: true, slug: true, parentId: true } } },
  },
  attributes: {
    select: { attribute: { select: { id: true, name: true, slug: true, type: true } } },
  },
  media: {
    select: mediaAttachmentSelect,
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
  variants: {
    select: variantSelect,
    orderBy: { createdAt: "asc" as const },
  },
};

export const productListSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  hasVariants: true,
  price: true,
  salePrice: true,
  stock: true,
  stockStatus: true,
  isActive: true,
  isFeatured: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  brand: { select: { id: true, name: true, slug: true } },
  categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
  media: {
    where: { isThumbnail: true, variantId: null },
    select: { media: { select: { id: true, url: true, thumbnailUrl: true, altText: true } } },
    take: 1,
  },
  variants: { select: { price: true, salePrice: true, stock: true } },
  _count: { select: { variants: true } },
};
