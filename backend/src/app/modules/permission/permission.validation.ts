import { z } from "zod";

import { toSlug } from "../../utils/slug";

const actionSchema = z
  .string()
  .trim()
  .min(1, "An action name is required.")
  .max(40, "An action name must be at most 40 characters.")
  .transform(toSlug)
  .refine((value) => value.length > 0, {
    message: "An action name must contain at least one letter or number.",
  });

const groupNameSchema = z
  .string()
  .trim()
  .min(2, "A group name must be at least 2 characters.")
  .max(50, "A group name must be at most 50 characters.")
  .refine((value) => toSlug(value).length > 0, {
    message: "A group name must contain at least one letter or number.",
  });

const descriptionSchema = z
  .string()
  .trim()
  .max(255, "A description must be at most 255 characters.")
  .optional();

const idParamSchema = z.object({
  id: z.uuid("A valid id is required."),
});

const listQuerySchema = z.object({
  searchTerm: z.string().trim().optional(),
  groupId: z.uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().trim().optional(),
});

const createGroupSchema = z.object({
  name: groupNameSchema,
  description: descriptionSchema,
  actions: z
    .array(actionSchema)
    .min(1, "Select at least one action for this group.")
    .max(30, "A group may hold at most 30 actions."),
});

const updateGroupSchema = z
  .object({
    name: groupNameSchema.optional(),
    description: descriptionSchema,
    actions: z.array(actionSchema).min(1).max(30).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

const createPermissionSchema = z.object({
  groupId: z.uuid("A valid group id is required."),
  action: actionSchema,
  description: descriptionSchema,
});

const updatePermissionSchema = z
  .object({
    action: actionSchema.optional(),
    description: descriptionSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

export const PermissionValidation = {
  idParamSchema,
  listQuerySchema,
  createGroupSchema,
  updateGroupSchema,
  createPermissionSchema,
  updatePermissionSchema,
};
