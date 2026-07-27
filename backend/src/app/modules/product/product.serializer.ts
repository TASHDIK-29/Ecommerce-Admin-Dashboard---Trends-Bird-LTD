import { priceRangeOf, toNumber } from "./product.helper";

interface RawVariantValue {
  attributeValue: {
    id: string;
    value: string;
    slug: string;
    colorCode: string | null;
    mediaId: string | null;
    attribute: { id: string; name: string; slug: string; type: string };
  };
}

interface RawVariant {
  id: string;
  sku: string;
  price: unknown;
  salePrice: unknown;
  stock: number;
  stockStatus: string;
  lowStockThreshold: number | null;
  weight: unknown;
  isActive: boolean;
  values: RawVariantValue[];
  media?: unknown[];
}

export const serializeVariant = (variant: RawVariant) => ({
  id: variant.id,
  sku: variant.sku,
  price: toNumber(variant.price),
  salePrice: toNumber(variant.salePrice),
  stock: variant.stock,
  stockStatus: variant.stockStatus,
  lowStockThreshold: variant.lowStockThreshold,
  weight: toNumber(variant.weight),
  isActive: variant.isActive,
  attributeValues: variant.values.map((link) => ({
    id: link.attributeValue.id,
    value: link.attributeValue.value,
    slug: link.attributeValue.slug,
    colorCode: link.attributeValue.colorCode,
    mediaId: link.attributeValue.mediaId,
    attribute: link.attributeValue.attribute,
  })),
  media: variant.media ?? [],
});

interface RawProduct {
  price: unknown;
  salePrice: unknown;
  weight: unknown;
  categories?: { category: unknown }[];
  attributes?: { attribute: unknown }[];
  variants?: RawVariant[];
  [key: string]: unknown;
}

export const serializeProduct = (product: RawProduct) => {
  const { categories, attributes, variants, ...rest } = product;

  return {
    ...rest,
    price: toNumber(product.price),
    salePrice: toNumber(product.salePrice),
    weight: toNumber(product.weight),
    categories: (categories ?? []).map((link) => link.category),
    attributes: (attributes ?? []).map((link) => link.attribute),
    variants: (variants ?? []).map(serializeVariant),
  };
};

interface RawListRow {
  price: unknown;
  salePrice: unknown;
  hasVariants: boolean;
  categories: { category: unknown }[];
  media: { media: unknown }[];
  variants: { price: unknown; salePrice: unknown; stock: number }[];
  _count: { variants: number };
  [key: string]: unknown;
}

export const serializeProductRow = (row: RawListRow) => {
  const { categories, media, variants, _count, ...rest } = row;

  const range = row.hasVariants ? priceRangeOf(variants) : null;
  const totalStock = row.hasVariants
    ? variants.reduce((sum, variant) => sum + variant.stock, 0)
    : (rest.stock as number | null);

  return {
    ...rest,
    price: toNumber(row.price),
    salePrice: toNumber(row.salePrice),
    priceRange: range,
    stock: totalStock,
    variantCount: _count.variants,
    thumbnail: media[0]?.media ?? null,
    categories: categories.map((link) => link.category),
  };
};
