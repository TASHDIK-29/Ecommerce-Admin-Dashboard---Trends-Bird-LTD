import { z } from "zod";

const idParamSchema = z.object({
  id: z.uuid("A valid media id is required."),
});

const listQuerySchema = z.object({
  searchTerm: z.string().trim().optional(),
  type: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().trim().optional(),
});

const deleteQuerySchema = z.object({
  force: z.string().trim().optional(),
});

const updateMediaSchema = z
  .object({
    altText: z
      .string()
      .trim()
      .max(255, "Alt text must be at most 255 characters.")
      .nullable()
      .optional(),
    title: z
      .string()
      .trim()
      .max(255, "A title must be at most 255 characters.")
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

export const MediaValidation = {
  idParamSchema,
  listQuerySchema,
  deleteQuerySchema,
  updateMediaSchema,
};
