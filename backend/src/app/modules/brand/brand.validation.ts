import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(2, "A brand name must be at least 2 characters.")
  .max(100, "A brand name must be at most 100 characters.");

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

const statusSchema = z.enum(["ACTIVE", "INACTIVE"], {
  message: "Status must be either ACTIVE or INACTIVE.",
});

const idParamSchema = z.object({
  id: z.uuid("A valid brand id is required."),
});

const listQuerySchema = z.object({
  searchTerm: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().trim().optional(),
});

const createBrandSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  description: descriptionSchema,
  logoId: z.uuid("A valid media id is required.").nullable().optional(),
  status: statusSchema.optional(),
});

const updateBrandSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema,
    logoId: z.uuid("A valid media id is required.").nullable().optional(),
    status: statusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

export const BrandValidation = {
  idParamSchema,
  listQuerySchema,
  createBrandSchema,
  updateBrandSchema,
};
