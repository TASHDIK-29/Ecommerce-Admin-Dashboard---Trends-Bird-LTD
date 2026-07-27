import { z } from "zod";

const roleNameSchema = z
  .string()
  .trim()
  .min(2, "A role name must be at least 2 characters.")
  .max(50, "A role name must be at most 50 characters.");

const descriptionSchema = z
  .string()
  .trim()
  .max(255, "A description must be at most 255 characters.")
  .optional();

const statusSchema = z.enum(["ACTIVE", "INACTIVE"], {
  message: "Status must be either ACTIVE or INACTIVE.",
});

const permissionIdsSchema = z
  .array(z.uuid("Each permission id must be a valid uuid."))
  .max(500, "Too many permissions in one request.");

const idParamSchema = z.object({
  id: z.uuid("A valid role id is required."),
});

const listQuerySchema = z.object({
  searchTerm: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().trim().optional(),
});

const createRoleSchema = z.object({
  name: roleNameSchema,
  description: descriptionSchema,
  status: statusSchema.optional(),
  permissionIds: permissionIdsSchema.optional(),
  grantAll: z.boolean().optional(),
});

const updateRoleSchema = z
  .object({
    name: roleNameSchema.optional(),
    description: descriptionSchema,
    status: statusSchema.optional(),
    permissionIds: permissionIdsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

const modifyPermissionsSchema = z.object({
  permissionIds: permissionIdsSchema.min(1, "Select at least one permission."),
});

export const RoleValidation = {
  idParamSchema,
  listQuerySchema,
  createRoleSchema,
  updateRoleSchema,
  modifyPermissionsSchema,
};
