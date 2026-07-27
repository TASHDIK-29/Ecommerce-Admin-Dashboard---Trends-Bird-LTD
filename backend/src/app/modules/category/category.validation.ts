import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(2, "A category name must be at least 2 characters.")
  .max(100, "A category name must be at most 100 characters.");

const slugSchema = z
  .string()
  .trim()
  .min(2, "A slug must be at least 2 characters.")
  .max(120, "A slug must be at most 120 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "A slug may contain lowercase letters, numbers and hyphens only.");

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, "A description must be at most 1000 characters.")
  .optional();

const idParamSchema = z.object({
  id: z.uuid("A valid category id is required."),
});

const listQuerySchema = z.object({
  searchTerm: z.string().trim().optional(),
  parentId: z.uuid().optional(),
  isActive: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().trim().optional(),
});

const treeQuerySchema = z.object({
  isActive: z.string().trim().optional(),
});

const createCategorySchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  description: descriptionSchema,
  imageId: z.uuid("A valid media id is required.").nullable().optional(),
  parentId: z.uuid("A valid parent category id is required.").nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema,
    imageId: z.uuid("A valid media id is required.").nullable().optional(),
    parentId: z.uuid("A valid parent category id is required.").nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

export const CategoryValidation = {
  idParamSchema,
  listQuerySchema,
  treeQuerySchema,
  createCategorySchema,
  updateCategorySchema,
};
