import type { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import { buildListQuery, buildMeta } from "../../utils/buildListQuery";
import { generateUniqueSlug } from "../../utils/slug";
import {
  mediaAttachmentSelect,
  productDetailSelect,
  productListSelect,
  productSearchableFields,
  productSortableFields,
  variantSelect,
} from "./product.constant";
import {
  assertSalePriceBelowPrice,
  combinationKeyFor,
  deriveStockStatus,
} from "./product.helper";
import type {
  IAttachMediaPayload,
  ICreateProductPayload,
  IGenerateVariantsPayload,
  IMediaAttachmentInput,
  IProductListQuery,
  IReorderMediaPayload,
  IUpdateAttachmentPayload,
  IUpdateProductPayload,
  IUpdateVariantPayload,
  IVariantInput,
} from "./product.interface";
import { serializeProduct, serializeProductRow, serializeVariant } from "./product.serializer";

type Tx = Prisma.TransactionClient;

const unique = (values: string[]): string[] => [...new Set(values)];

const notFound = (what: string): AppError => new AppError(StatusCodes.NOT_FOUND, `${what} not found.`);

const assertSkuAvailable = async (sku: string, excludeProductId?: string): Promise<void> => {
  const [product, variant] = await Promise.all([
    prisma.product.findUnique({ where: { sku }, select: { id: true } }),
    prisma.productVariant.findUnique({ where: { sku }, select: { id: true } }),
  ]);

  if ((product && product.id !== excludeProductId) || variant) {
    throw new AppError(StatusCodes.CONFLICT, `The SKU "${sku}" is already in use.`, [
      { path: "sku", message: "This SKU is already taken." },
    ]);
  }
};

const assertVariantSkusAvailable = async (
  skus: string[],
  excludeVariantIds: string[] = [],
): Promise<void> => {
  const duplicatesInPayload = skus.filter((sku, index) => skus.indexOf(sku) !== index);
  if (duplicatesInPayload.length > 0) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `Duplicate variant SKU in this request: ${unique(duplicatesInPayload).join(", ")}.`,
      [{ path: "variants", message: "Variant SKUs must be unique." }],
    );
  }

  const [products, variants] = await Promise.all([
    prisma.product.findMany({ where: { sku: { in: skus } }, select: { sku: true } }),
    prisma.productVariant.findMany({
      where: { sku: { in: skus }, id: { notIn: excludeVariantIds } },
      select: { sku: true },
    }),
  ]);

  const taken = unique([...products, ...variants].map((row) => row.sku));
  if (taken.length > 0) {
    throw new AppError(StatusCodes.CONFLICT, `SKU already in use: ${taken.join(", ")}.`, [
      { path: "variants", message: `SKU already in use: ${taken.join(", ")}.` },
    ]);
  }
};

const assertBrandExists = async (brandId: string): Promise<void> => {
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
  if (brand) return;

  throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "The selected brand does not exist.", [
    { path: "brandId", message: "No brand with this id." },
  ]);
};

const assertCategoriesExist = async (categoryIds: string[]): Promise<void> => {
  const ids = unique(categoryIds);
  if (ids.length === 0) return;

  const found = await prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length === ids.length) return;

  const foundIds = new Set(found.map((c) => c.id));
  throw new AppError(
    StatusCodes.UNPROCESSABLE_ENTITY,
    "One or more categories do not exist.",
    ids.filter((id) => !foundIds.has(id)).map((id) => ({
      path: "categoryIds",
      message: `No category with id ${id}.`,
    })),
  );
};

const assertAttributesExist = async (attributeIds: string[]): Promise<void> => {
  const ids = unique(attributeIds);
  if (ids.length === 0) return;

  const found = await prisma.attribute.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length === ids.length) return;

  const foundIds = new Set(found.map((a) => a.id));
  throw new AppError(
    StatusCodes.UNPROCESSABLE_ENTITY,
    "One or more attributes do not exist.",
    ids.filter((id) => !foundIds.has(id)).map((id) => ({
      path: "attributeIds",
      message: `No attribute with id ${id}.`,
    })),
  );
};

const assertMediaExist = async (mediaIds: string[]): Promise<void> => {
  const ids = unique(mediaIds);
  if (ids.length === 0) return;

  const found = await prisma.media.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (found.length === ids.length) return;

  const foundIds = new Set(found.map((m) => m.id));
  throw new AppError(
    StatusCodes.UNPROCESSABLE_ENTITY,
    "One or more media assets do not exist.",
    ids.filter((id) => !foundIds.has(id)).map((id) => ({
      path: "mediaId",
      message: `No media with id ${id}.`,
    })),
  );
};

const resolveAttributeValues = async (ids: string[]) => {
  const uniqueIds = unique(ids);

  const found = await prisma.attributeValue.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, value: true, attributeId: true, attribute: { select: { name: true } } },
  });

  if (found.length !== uniqueIds.length) {
    const foundIds = new Set(found.map((v) => v.id));
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "One or more attribute values do not exist.",
      uniqueIds.filter((id) => !foundIds.has(id)).map((id) => ({
        path: "attributeValueIds",
        message: `No attribute value with id ${id}.`,
      })),
    );
  }

  return found;
};

const assertOneValuePerAttribute = (
  values: { id: string; value: string; attributeId: string; attribute: { name: string } }[],
  sku: string,
): void => {
  const seen = new Map<string, string>();

  for (const value of values) {
    const existing = seen.get(value.attributeId);
    if (existing) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `Variant "${sku}" picks two values from "${value.attribute.name}" (${existing} and ${value.value}).`,
        [{ path: "attributeValueIds", message: "A variant may hold one value per attribute." }],
      );
    }
    seen.set(value.attributeId, value.value);
  }
};

const prepareVariants = async (variants: IVariantInput[], excludeVariantIds: string[] = []) => {
  const prepared: {
    sku: string;
    combinationKey: string;
    price: number;
    salePrice: number | null;
    stock: number;
    stockStatus: ReturnType<typeof deriveStockStatus>;
    lowStockThreshold: number | null;
    weight: number | null;
    isActive: boolean;
    attributeValueIds: string[];
    mediaIds: string[];
  }[] = [];

  await assertVariantSkusAvailable(
    variants.map((variant) => variant.sku),
    excludeVariantIds,
  );

  const allValueIds = variants.flatMap((variant) => variant.attributeValueIds);
  const resolved = await resolveAttributeValues(allValueIds);
  const byId = new Map(resolved.map((value) => [value.id, value]));

  await assertMediaExist(variants.flatMap((variant) => variant.mediaIds ?? []));

  const seenCombinations = new Map<string, string>();

  for (const variant of variants) {
    const values = variant.attributeValueIds.flatMap((valueId) => {
      const value = byId.get(valueId);
      return value ? [value] : [];
    });
    assertOneValuePerAttribute(values, variant.sku);
    assertSalePriceBelowPrice(variant.price, variant.salePrice, `Variant "${variant.sku}"`);

    const key = combinationKeyFor(variant.attributeValueIds);
    const clash = seenCombinations.get(key);
    if (clash) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `Variants "${clash}" and "${variant.sku}" have the same attribute combination.`,
        [{ path: "variants", message: "Each variant must have a unique attribute combination." }],
      );
    }
    seenCombinations.set(key, variant.sku);

    const stock = variant.stock ?? 0;

    prepared.push({
      sku: variant.sku,
      combinationKey: key,
      price: variant.price,
      salePrice: variant.salePrice ?? null,
      stock,
      stockStatus: deriveStockStatus(stock, variant.lowStockThreshold),
      lowStockThreshold: variant.lowStockThreshold ?? null,
      weight: variant.weight ?? null,
      isActive: variant.isActive ?? true,
      attributeValueIds: unique(variant.attributeValueIds),
      mediaIds: unique(variant.mediaIds ?? []),
    });
  }

  return prepared;
};

const assertSimpleOrVariableConsistency = (payload: ICreateProductPayload): void => {
  const hasVariants = payload.hasVariants ?? false;
  const variantCount = payload.variants?.length ?? 0;

  if (hasVariants) {
    if (payload.price !== undefined || payload.salePrice !== undefined || payload.stock !== undefined) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "A variable product carries its price and stock on each variant, not on the product.",
        [{ path: "price", message: "Remove price, salePrice and stock from a variable product." }],
      );
    }
    if (variantCount === 0) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "A variable product needs at least one variant.",
        [{ path: "variants", message: "Add a variant, or set hasVariants to false." }],
      );
    }
    return;
  }

  if (variantCount > 0) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "A simple product cannot have variants. Set hasVariants to true first.",
      [{ path: "variants", message: "Variants are only allowed on a variable product." }],
    );
  }

  if (payload.price === undefined) {
    throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "A simple product needs a price.", [
      { path: "price", message: "Price is required for a simple product." },
    ]);
  }
};

const attachmentTargetOf = (attachment: IMediaAttachmentInput) => ({
  variantId: attachment.variantId ?? null,
  attributeValueId: attachment.attributeValueId ?? null,
});

const assertSingleAttachmentTarget = (attachment: IMediaAttachmentInput): void => {
  if (attachment.variantId && attachment.attributeValueId) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "An attachment targets either a variant or an attribute value, not both.",
      [{ path: "attachments", message: "Choose one target." }],
    );
  }
};

const demoteOtherThumbnails = async (
  tx: Tx,
  productId: string,
  variantId: string | null,
  keepAttachmentId?: string,
): Promise<void> => {
  await tx.productMedia.updateMany({
    where: {
      productId,
      variantId,
      isThumbnail: true,
      ...(keepAttachmentId ? { id: { not: keepAttachmentId } } : {}),
    },
    data: { isThumbnail: false },
  });
};

const createProduct = async (payload: ICreateProductPayload) => {
  assertSimpleOrVariableConsistency(payload);
  assertSalePriceBelowPrice(payload.price, payload.salePrice, "Product");

  await assertSkuAvailable(payload.sku);

  const slug = payload.slug
    ? payload.slug
    : await generateUniqueSlug(payload.name, async (candidate) =>
        Boolean(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })),
      );

  const slugClash = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (slugClash) {
    throw new AppError(StatusCodes.CONFLICT, `A product with the slug "${slug}" already exists.`, [
      { path: "slug", message: "This slug is already taken." },
    ]);
  }

  if (payload.brandId) await assertBrandExists(payload.brandId);
  await assertCategoriesExist(payload.categoryIds ?? []);
  await assertAttributesExist(payload.attributeIds ?? []);

  for (const attachment of payload.media ?? []) assertSingleAttachmentTarget(attachment);
  await assertMediaExist((payload.media ?? []).map((a) => a.mediaId));

  const preparedVariants = payload.variants ? await prepareVariants(payload.variants) : [];

  const thumbnails = (payload.media ?? []).filter((a) => a.isThumbnail && !a.variantId);
  if (thumbnails.length > 1) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "Only one product thumbnail may be set.",
      [{ path: "media", message: "Exactly one attachment may be the thumbnail." }],
    );
  }

  const stock = payload.stock ?? 0;

  const productId = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: payload.name,
        slug,
        sku: payload.sku,
        shortDescription: payload.shortDescription,
        longDescription: payload.longDescription,
        hasVariants: payload.hasVariants ?? false,
        price: payload.hasVariants ? null : payload.price,
        salePrice: payload.hasVariants ? null : (payload.salePrice ?? null),
        stock: payload.hasVariants ? null : stock,
        stockStatus: payload.hasVariants ? null : deriveStockStatus(stock, payload.lowStockThreshold),
        lowStockThreshold: payload.hasVariants ? null : (payload.lowStockThreshold ?? null),
        weight: payload.weight ?? null,
        isActive: payload.isActive ?? true,
        isFeatured: payload.isFeatured ?? false,
        sortOrder: payload.sortOrder ?? 0,
        brandId: payload.brandId ?? null,
        categories: {
          create: unique(payload.categoryIds ?? []).map((categoryId) => ({ categoryId })),
        },
        attributes: {
          create: unique(payload.attributeIds ?? []).map((attributeId) => ({ attributeId })),
        },
      },
      select: { id: true },
    });

    const variantIdBySku = new Map<string, string>();

    for (const variant of preparedVariants) {
      const created = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: variant.sku,
          combinationKey: variant.combinationKey,
          price: variant.price,
          salePrice: variant.salePrice,
          stock: variant.stock,
          stockStatus: variant.stockStatus,
          lowStockThreshold: variant.lowStockThreshold,
          weight: variant.weight,
          isActive: variant.isActive,
          values: {
            create: variant.attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
          },
        },
        select: { id: true },
      });

      variantIdBySku.set(variant.sku, created.id);

      for (const [index, mediaId] of variant.mediaIds.entries()) {
        await tx.productMedia.create({
          data: {
            productId: product.id,
            mediaId,
            variantId: created.id,
            isThumbnail: index === 0,
            isGallery: true,
            sortOrder: index,
          },
        });
      }
    }

    for (const [index, attachment] of (payload.media ?? []).entries()) {
      await tx.productMedia.create({
        data: {
          productId: product.id,
          mediaId: attachment.mediaId,
          ...attachmentTargetOf(attachment),
          isThumbnail: attachment.isThumbnail ?? false,
          isGallery: attachment.isGallery ?? true,
          sortOrder: attachment.sortOrder ?? index,
        },
      });
    }

    return product.id;
  });

  return getProductById(productId);
};

const getProducts = async (query: IProductListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: productSearchableFields,
    sortableFields: productSortableFields,
    filters: {
      brandId: { type: "string" },
      isActive: { type: "boolean" },
      isFeatured: { type: "boolean" },
      hasVariants: { type: "boolean" },
      stockStatus: {
        type: "enum",
        values: ["IN_STOCK", "OUT_OF_STOCK", "LOW_STOCK"],
      },
      categoryId: {
        type: "custom",
        build: (raw) => ({ categories: { some: { categoryId: raw } } }),
      },
    },
    defaultSort: { createdAt: "desc" },
  });

  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({ where, orderBy, skip, take, select: productListSelect }),
    prisma.product.count({ where }),
  ]);

  return { data: rows.map(serializeProductRow), meta: buildMeta(total, page, limit) };
};

const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({ where: { id }, select: productDetailSelect });

  if (!product) throw notFound("Product");

  return serializeProduct(product);
};

/**
 * The dashboard addresses a product by its slug so the surrogate id never has to
 * appear in a browser URL. The slug is unique, so this resolves to one record.
 */
const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findUnique({ where: { slug }, select: productDetailSelect });

  if (!product) throw notFound("Product");

  return serializeProduct(product);
};

const updateProduct = async (id: string, payload: IUpdateProductPayload) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, sku: true, slug: true, hasVariants: true, stock: true, lowStockThreshold: true, price: true },
  });

  if (!product) throw notFound("Product");

  if (product.hasVariants) {
    if (payload.price !== undefined || payload.salePrice !== undefined || payload.stock !== undefined) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "A variable product carries its price and stock on each variant, not on the product.",
        [{ path: "price", message: "Update the variants instead." }],
      );
    }
  }

  if (payload.sku && payload.sku !== product.sku) await assertSkuAvailable(payload.sku, id);

  if (payload.slug && payload.slug !== product.slug) {
    const clash = await prisma.product.findUnique({ where: { slug: payload.slug }, select: { id: true } });
    if (clash) {
      throw new AppError(StatusCodes.CONFLICT, `A product with the slug "${payload.slug}" already exists.`, [
        { path: "slug", message: "This slug is already taken." },
      ]);
    }
  }

  if (payload.brandId) await assertBrandExists(payload.brandId);
  if (payload.categoryIds) await assertCategoriesExist(payload.categoryIds);
  if (payload.attributeIds) await assertAttributesExist(payload.attributeIds);

  const nextPrice = payload.price === undefined ? Number(product.price ?? 0) : payload.price;
  assertSalePriceBelowPrice(nextPrice, payload.salePrice, "Product");

  const nextStock = payload.stock === undefined ? product.stock : payload.stock;
  const nextThreshold =
    payload.lowStockThreshold === undefined ? product.lowStockThreshold : payload.lowStockThreshold;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: payload.name,
        slug: payload.slug,
        sku: payload.sku,
        shortDescription: payload.shortDescription,
        longDescription: payload.longDescription,
        price: payload.price,
        salePrice: payload.salePrice,
        stock: payload.stock,
        stockStatus:
          product.hasVariants || nextStock === null
            ? undefined
            : deriveStockStatus(nextStock, nextThreshold),
        lowStockThreshold: payload.lowStockThreshold,
        weight: payload.weight,
        isActive: payload.isActive,
        isFeatured: payload.isFeatured,
        sortOrder: payload.sortOrder,
        brandId: payload.brandId,
      },
    });

    if (payload.categoryIds) {
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.productCategory.createMany({
        data: unique(payload.categoryIds).map((categoryId) => ({ productId: id, categoryId })),
        skipDuplicates: true,
      });
    }

    if (payload.attributeIds) {
      await tx.productAttribute.deleteMany({ where: { productId: id } });
      await tx.productAttribute.createMany({
        data: unique(payload.attributeIds).map((attributeId) => ({ productId: id, attributeId })),
        skipDuplicates: true,
      });
    }
  });

  return getProductById(id);
};

const deleteProduct = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, sku: true, _count: { select: { variants: true, media: true } } },
  });

  if (!product) throw notFound("Product");

  await prisma.product.delete({ where: { id } });

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    deletedVariants: product._count.variants,
    detachedMedia: product._count.media,
  };
};

const loadVariableProduct = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, hasVariants: true },
  });

  if (!product) throw notFound("Product");

  if (!product.hasVariants) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "This is a simple product, so it cannot hold variants.",
      [{ path: "variants", message: "Set hasVariants to true first." }],
    );
  }

  return product;
};

const addVariant = async (id: string, payload: IVariantInput) => {
  await loadVariableProduct(id);

  const [prepared] = await prepareVariants([payload]);

  const clash = await prisma.productVariant.findFirst({
    where: { productId: id, combinationKey: prepared.combinationKey },
    select: { sku: true },
  });

  if (clash) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `Variant "${clash.sku}" already uses this attribute combination.`,
      [{ path: "attributeValueIds", message: "This combination already exists on the product." }],
    );
  }

  const variant = await prisma.$transaction(async (tx) => {
    const created = await tx.productVariant.create({
      data: {
        productId: id,
        sku: prepared.sku,
        combinationKey: prepared.combinationKey,
        price: prepared.price,
        salePrice: prepared.salePrice,
        stock: prepared.stock,
        stockStatus: prepared.stockStatus,
        lowStockThreshold: prepared.lowStockThreshold,
        weight: prepared.weight,
        isActive: prepared.isActive,
        values: {
          create: prepared.attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
        },
      },
      select: { id: true },
    });

    for (const [index, mediaId] of prepared.mediaIds.entries()) {
      await tx.productMedia.create({
        data: {
          productId: id,
          mediaId,
          variantId: created.id,
          isThumbnail: index === 0,
          sortOrder: index,
        },
      });
    }

    return created.id;
  });

  const created = await prisma.productVariant.findUniqueOrThrow({
    where: { id: variant },
    select: variantSelect,
  });

  return serializeVariant(created);
};

const updateVariant = async (id: string, variantId: string, payload: IUpdateVariantPayload) => {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: id },
    select: {
      id: true,
      sku: true,
      price: true,
      stock: true,
      lowStockThreshold: true,
      values: { select: { attributeValueId: true } },
    },
  });

  if (!variant) throw notFound("Variant");

  if (payload.sku && payload.sku !== variant.sku) {
    await assertVariantSkusAvailable([payload.sku], [variantId]);
  }

  let combinationKey: string | undefined;

  if (payload.attributeValueIds) {
    const values = await resolveAttributeValues(payload.attributeValueIds);
    assertOneValuePerAttribute(values, payload.sku ?? variant.sku);

    combinationKey = combinationKeyFor(payload.attributeValueIds);

    const clash = await prisma.productVariant.findFirst({
      where: { productId: id, combinationKey, id: { not: variantId } },
      select: { sku: true },
    });

    if (clash) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `Variant "${clash.sku}" already uses this attribute combination.`,
        [{ path: "attributeValueIds", message: "This combination already exists on the product." }],
      );
    }
  }

  const nextPrice = payload.price ?? Number(variant.price);
  assertSalePriceBelowPrice(nextPrice, payload.salePrice, `Variant "${variant.sku}"`);

  const nextStock = payload.stock ?? variant.stock;
  const nextThreshold =
    payload.lowStockThreshold === undefined ? variant.lowStockThreshold : payload.lowStockThreshold;

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.update({
      where: { id: variantId },
      data: {
        sku: payload.sku,
        price: payload.price,
        salePrice: payload.salePrice,
        stock: payload.stock,
        stockStatus: deriveStockStatus(nextStock, nextThreshold),
        lowStockThreshold: payload.lowStockThreshold,
        weight: payload.weight,
        isActive: payload.isActive,
        combinationKey,
      },
    });

    if (payload.attributeValueIds) {
      await tx.variantAttributeValue.deleteMany({ where: { variantId } });
      await tx.variantAttributeValue.createMany({
        data: unique(payload.attributeValueIds).map((attributeValueId) => ({
          variantId,
          attributeValueId,
        })),
        skipDuplicates: true,
      });
    }
  });

  const updated = await prisma.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: variantSelect,
  });

  return serializeVariant(updated);
};

const deleteVariant = async (id: string, variantId: string) => {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: id },
    select: { id: true, sku: true },
  });

  if (!variant) throw notFound("Variant");

  await prisma.productVariant.delete({ where: { id: variantId } });

  return { id: variant.id, sku: variant.sku };
};

const generateVariants = async (id: string, payload: IGenerateVariantsPayload) => {
  await loadVariableProduct(id);

  const attributeIds = payload.attributes.map((entry) => entry.attributeId);
  if (unique(attributeIds).length !== attributeIds.length) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "Each attribute may take part only once.",
      [{ path: "attributes", message: "Duplicate attribute in the matrix." }],
    );
  }

  await assertAttributesExist(attributeIds);

  const valueIds = payload.attributes.flatMap((entry) => entry.valueIds);
  const resolved = await resolveAttributeValues(valueIds);
  const byId = new Map(resolved.map((value) => [value.id, value]));

  for (const entry of payload.attributes) {
    for (const valueId of entry.valueIds) {
      const value = byId.get(valueId);
      if (value && value.attributeId !== entry.attributeId) {
        throw new AppError(
          StatusCodes.UNPROCESSABLE_ENTITY,
          `Value "${value.value}" does not belong to the attribute it was listed under.`,
          [{ path: "attributes", message: "Value and attribute mismatch." }],
        );
      }
    }
  }

  let combinations: string[][] = [[]];
  for (const entry of payload.attributes) {
    combinations = combinations.flatMap((combination) =>
      unique(entry.valueIds).map((valueId) => [...combination, valueId]),
    );
  }

  if (combinations.length > 200) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      `That selection would produce ${combinations.length} variants. Narrow it to 200 or fewer.`,
      [{ path: "attributes", message: "Too many combinations." }],
    );
  }

  const existing = await prisma.productVariant.findMany({
    where: { productId: id },
    select: { id: true, combinationKey: true },
  });
  const existingKeys = new Set(existing.map((variant) => variant.combinationKey));

  const prefix = payload.skuPrefix ?? "VAR";
  const stamp = Date.now().toString(36).toUpperCase();

  const toCreate: IVariantInput[] = [];
  let index = existing.length + 1;

  for (const combination of combinations) {
    const key = combinationKeyFor(combination);
    if (!payload.replaceExisting && existingKeys.has(key)) continue;

    toCreate.push({
      sku: `${prefix}-${stamp}-${index}`,
      attributeValueIds: combination,
      price: payload.price,
      salePrice: payload.salePrice ?? null,
      stock: payload.stock ?? 0,
    });
    index += 1;
  }

  if (payload.replaceExisting) {
    await prisma.productVariant.deleteMany({ where: { productId: id } });
  }

  if (toCreate.length === 0) {
    return { created: 0, skipped: combinations.length, product: await getProductById(id) };
  }

  const prepared = await prepareVariants(
    toCreate,
    payload.replaceExisting ? existing.map((variant) => variant.id) : [],
  );

  await prisma.$transaction(async (tx) => {
    for (const variant of prepared) {
      await tx.productVariant.create({
        data: {
          productId: id,
          sku: variant.sku,
          combinationKey: variant.combinationKey,
          price: variant.price,
          salePrice: variant.salePrice,
          stock: variant.stock,
          stockStatus: variant.stockStatus,
          lowStockThreshold: variant.lowStockThreshold,
          weight: variant.weight,
          isActive: variant.isActive,
          values: {
            create: variant.attributeValueIds.map((attributeValueId) => ({ attributeValueId })),
          },
        },
      });
    }
  });

  return {
    created: prepared.length,
    skipped: combinations.length - prepared.length,
    product: await getProductById(id),
  };
};

const attachMedia = async (id: string, payload: IAttachMediaPayload) => {
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) throw notFound("Product");

  for (const attachment of payload.attachments) assertSingleAttachmentTarget(attachment);
  await assertMediaExist(payload.attachments.map((a) => a.mediaId));

  const variantIds = unique(
    payload.attachments.flatMap((a) => (a.variantId ? [a.variantId] : [])),
  );
  if (variantIds.length > 0) {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, productId: id },
      select: { id: true },
    });
    if (variants.length !== variantIds.length) {
      throw new AppError(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "One or more variants do not belong to this product.",
        [{ path: "variantId", message: "Unknown variant for this product." }],
      );
    }
  }

  const attributeValueIds = unique(
    payload.attachments.flatMap((a) => (a.attributeValueId ? [a.attributeValueId] : [])),
  );
  if (attributeValueIds.length > 0) await resolveAttributeValues(attributeValueIds);

  await prisma.$transaction(async (tx) => {
    for (const attachment of payload.attachments) {
      if (attachment.isThumbnail) {
        await demoteOtherThumbnails(tx, id, attachment.variantId ?? null);
      }

      await tx.productMedia.create({
        data: {
          productId: id,
          mediaId: attachment.mediaId,
          ...attachmentTargetOf(attachment),
          isThumbnail: attachment.isThumbnail ?? false,
          isGallery: attachment.isGallery ?? true,
          sortOrder: attachment.sortOrder ?? 0,
        },
      });
    }
  });

  return getProductById(id);
};

const updateAttachment = async (
  id: string,
  attachmentId: string,
  payload: IUpdateAttachmentPayload,
) => {
  const attachment = await prisma.productMedia.findFirst({
    where: { id: attachmentId, productId: id },
    select: { id: true, variantId: true },
  });

  if (!attachment) throw notFound("Media attachment");

  await prisma.$transaction(async (tx) => {
    if (payload.isThumbnail) {
      await demoteOtherThumbnails(tx, id, attachment.variantId, attachmentId);
    }

    await tx.productMedia.update({
      where: { id: attachmentId },
      data: {
        isThumbnail: payload.isThumbnail,
        isGallery: payload.isGallery,
        sortOrder: payload.sortOrder,
      },
    });
  });

  return prisma.productMedia.findUniqueOrThrow({
    where: { id: attachmentId },
    select: mediaAttachmentSelect,
  });
};

const reorderMedia = async (id: string, payload: IReorderMediaPayload) => {
  const ids = payload.order.map((entry) => entry.attachmentId);

  const owned = await prisma.productMedia.findMany({
    where: { id: { in: ids }, productId: id },
    select: { id: true },
  });

  if (owned.length !== unique(ids).length) {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "One or more attachments do not belong to this product.",
      [{ path: "order", message: "Unknown attachment for this product." }],
    );
  }

  await prisma.$transaction(
    payload.order.map((entry) =>
      prisma.productMedia.update({
        where: { id: entry.attachmentId },
        data: { sortOrder: entry.sortOrder },
      }),
    ),
  );

  return getProductById(id);
};

const detachMedia = async (id: string, attachmentId: string) => {
  const attachment = await prisma.productMedia.findFirst({
    where: { id: attachmentId, productId: id },
    select: { id: true, mediaId: true },
  });

  if (!attachment) throw notFound("Media attachment");

  await prisma.productMedia.delete({ where: { id: attachmentId } });

  return { id: attachment.id, mediaId: attachment.mediaId, mediaAssetKept: true };
};

export const ProductService = {
  createProduct,
  getProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  generateVariants,
  attachMedia,
  updateAttachment,
  reorderMedia,
  detachMedia,
};
