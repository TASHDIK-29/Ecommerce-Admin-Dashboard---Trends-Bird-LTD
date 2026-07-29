import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(2, "A product name must be at least 2 characters.")
  .max(200, "A product name must be at most 200 characters.");

const slugSchema = z
  .string()
  .trim()
  .min(2, "A slug must be at least 2 characters.")
  .max(220, "A slug must be at most 220 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "A slug may contain lowercase letters, numbers and hyphens only.");

const skuSchema = z
  .string()
  .trim()
  .min(1, "A SKU is required.")
  .max(64, "A SKU must be at most 64 characters.")
  .regex(/^[A-Za-z0-9._-]+$/, "A SKU may contain letters, numbers, dots, hyphens and underscores only.");

const moneySchema = z
  .number({ message: "Enter a valid amount." })
  .nonnegative("Price cannot be negative.")
  .max(99999999.99, "That amount is too large.");

const stockSchema = z
  .number({ message: "Enter a valid stock count." })
  .int("Stock must be a whole number.")
  .nonnegative("Stock cannot be negative.")
  .max(100000000, "That stock count is too large.");

const weightSchema = z.number().nonnegative("Weight cannot be negative.").max(9999999);

const variantBodySchema = z.object({
  sku: skuSchema,
  attributeValueIds: z
    .array(z.uuid("Each attribute value id must be a valid uuid."))
    .min(1, "A variant needs at least one attribute value.")
    .max(10, "A variant may combine at most 10 attribute values."),
  price: moneySchema,
  salePrice: moneySchema.nullable().optional(),
  stock: stockSchema.optional(),
  lowStockThreshold: stockSchema.nullable().optional(),
  weight: weightSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  mediaIds: z.array(z.uuid()).max(20).optional(),
});

const mediaAttachmentSchema = z.object({
  mediaId: z.uuid("A valid media id is required."),
  variantId: z.uuid().nullable().optional(),
  attributeValueId: z.uuid().nullable().optional(),
  isThumbnail: z.boolean().optional(),
  isGallery: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

const idParamSchema = z.object({
  id: z.uuid("A valid product id is required."),
});

const slugParamSchema = z.object({
  slug: slugSchema,
});

const variantParamSchema = z.object({
  id: z.uuid("A valid product id is required."),
  variantId: z.uuid("A valid variant id is required."),
});

const attachmentParamSchema = z.object({
  id: z.uuid("A valid product id is required."),
  attachmentId: z.uuid("A valid attachment id is required."),
});

const listQuerySchema = z.object({
  searchTerm: z.string().trim().optional(),
  categoryId: z.uuid().optional(),
  brandId: z.uuid().optional(),
  isActive: z.string().trim().optional(),
  isFeatured: z.string().trim().optional(),
  hasVariants: z.string().trim().optional(),
  stockStatus: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().trim().optional(),
});

const baseProductShape = {
  name: nameSchema,
  slug: slugSchema.optional(),
  sku: skuSchema,
  shortDescription: z.string().trim().max(500).optional(),
  longDescription: z.string().trim().max(20000).optional(),
  hasVariants: z.boolean().optional(),
  price: moneySchema.optional(),
  salePrice: moneySchema.nullable().optional(),
  stock: stockSchema.optional(),
  lowStockThreshold: stockSchema.nullable().optional(),
  weight: weightSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  brandId: z.uuid("A valid brand id is required.").nullable().optional(),
  categoryIds: z.array(z.uuid()).max(50).optional(),
  attributeIds: z.array(z.uuid()).max(20).optional(),
  media: z.array(mediaAttachmentSchema).max(50).optional(),
  variants: z.array(variantBodySchema).max(200).optional(),
};

const createProductSchema = z.object(baseProductShape);

const updateProductSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    sku: skuSchema.optional(),
    shortDescription: z.string().trim().max(500).nullable().optional(),
    longDescription: z.string().trim().max(20000).nullable().optional(),
    price: moneySchema.nullable().optional(),
    salePrice: moneySchema.nullable().optional(),
    stock: stockSchema.nullable().optional(),
    lowStockThreshold: stockSchema.nullable().optional(),
    weight: weightSchema.nullable().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    brandId: z.uuid("A valid brand id is required.").nullable().optional(),
    categoryIds: z.array(z.uuid()).max(50).optional(),
    attributeIds: z.array(z.uuid()).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

const createVariantSchema = variantBodySchema;

const updateVariantSchema = z
  .object({
    sku: skuSchema.optional(),
    attributeValueIds: z.array(z.uuid()).min(1).max(10).optional(),
    price: moneySchema.optional(),
    salePrice: moneySchema.nullable().optional(),
    stock: stockSchema.optional(),
    lowStockThreshold: stockSchema.nullable().optional(),
    weight: weightSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

const generateVariantsSchema = z.object({
  attributes: z
    .array(
      z.object({
        attributeId: z.uuid("A valid attribute id is required."),
        valueIds: z.array(z.uuid()).min(1, "Select at least one value.").max(50),
      }),
    )
    .min(1, "Select at least one attribute.")
    .max(5, "At most 5 attributes may take part in a variant matrix."),
  skuPrefix: z
    .string()
    .trim()
    .max(32)
    .regex(/^[A-Za-z0-9._-]*$/, "The SKU prefix may contain letters, numbers, dots, hyphens and underscores only.")
    .optional(),
  price: moneySchema,
  salePrice: moneySchema.nullable().optional(),
  stock: stockSchema.optional(),
  replaceExisting: z.boolean().optional(),
});

const attachMediaSchema = z.object({
  attachments: z.array(mediaAttachmentSchema).min(1, "Provide at least one attachment.").max(50),
});

const updateAttachmentSchema = z
  .object({
    isThumbnail: z.boolean().optional(),
    isGallery: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

const reorderMediaSchema = z.object({
  order: z
    .array(z.object({ attachmentId: z.uuid(), sortOrder: z.coerce.number().int().min(0).max(9999) }))
    .min(1, "Provide at least one attachment to reorder.")
    .max(100),
});

export const ProductValidation = {
  idParamSchema,
  slugParamSchema,
  variantParamSchema,
  attachmentParamSchema,
  listQuerySchema,
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  generateVariantsSchema,
  attachMediaSchema,
  updateAttachmentSchema,
  reorderMediaSchema,
};
