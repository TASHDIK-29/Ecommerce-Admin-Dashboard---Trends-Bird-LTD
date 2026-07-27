import { z } from "zod";

import { ATTRIBUTE_TYPES } from "./attribute.constant";

const nameSchema = z
  .string()
  .trim()
  .min(2, "An attribute name must be at least 2 characters.")
  .max(100, "An attribute name must be at most 100 characters.");

const slugSchema = z
  .string()
  .trim()
  .min(2, "A slug must be at least 2 characters.")
  .max(120, "A slug must be at most 120 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "A slug may contain lowercase letters, numbers and hyphens only.");

const typeSchema = z.enum(ATTRIBUTE_TYPES, {
  message: `Type must be one of: ${ATTRIBUTE_TYPES.join(", ")}.`,
});

const colorCodeSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a hex colour such as #C0392B.");

const valueBodySchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "A value is required.")
    .max(100, "A value must be at most 100 characters."),
  slug: slugSchema.optional(),
  colorCode: colorCodeSchema.nullable().optional(),
  mediaId: z.uuid("A valid media id is required.").nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

const idParamSchema = z.object({
  id: z.uuid("A valid attribute id is required."),
});

const valueParamSchema = z.object({
  id: z.uuid("A valid attribute id is required."),
  valueId: z.uuid("A valid attribute value id is required."),
});

const listQuerySchema = z.object({
  searchTerm: z.string().trim().optional(),
  type: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().trim().optional(),
});

const createAttributeSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  type: typeSchema.optional(),
  values: z.array(valueBodySchema).max(200, "Too many values in one request.").optional(),
});

const updateAttributeSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    type: typeSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

const addValuesSchema = z.object({
  values: z
    .array(valueBodySchema)
    .min(1, "Provide at least one value.")
    .max(200, "Too many values in one request."),
});

const updateValueSchema = z
  .object({
    value: z.string().trim().min(1).max(100).optional(),
    slug: slugSchema.optional(),
    colorCode: colorCodeSchema.nullable().optional(),
    mediaId: z.uuid("A valid media id is required.").nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

export const AttributeValidation = {
  idParamSchema,
  valueParamSchema,
  listQuerySchema,
  createAttributeSchema,
  updateAttributeSchema,
  addValuesSchema,
  updateValueSchema,
};
