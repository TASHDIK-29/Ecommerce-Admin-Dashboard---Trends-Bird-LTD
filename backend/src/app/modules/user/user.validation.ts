import { z } from "zod";

import { passwordSchema } from "../auth/auth.validation";

const nameSchema = z
  .string()
  .trim()
  .min(2, "A name must be at least 2 characters.")
  .max(100, "A name must be at most 100 characters.");

const emailSchema = z.email("Enter a valid email address.").trim().toLowerCase();

const phoneSchema = z
  .string()
  .trim()
  .min(6, "A phone number must be at least 6 characters.")
  .max(20, "A phone number must be at most 20 characters.")
  .regex(/^\+?[0-9][0-9\s-]*$/, "Enter a valid phone number.")
  .optional();

const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"], {
  message: "Gender must be MALE, FEMALE or OTHER.",
});

const idParamSchema = z.object({
  id: z.uuid("A valid user id is required."),
});

const listQuerySchema = z.object({
  searchTerm: z.string().trim().optional(),
  roleId: z.uuid().optional(),
  isActive: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().trim().optional(),
});

const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  gender: genderSchema.optional(),
  avatarId: z.uuid("A valid media id is required.").optional(),
  roleId: z.uuid("A valid role id is required."),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    phone: phoneSchema,
    gender: genderSchema.optional(),
    avatarId: z.uuid("A valid media id is required.").nullable().optional(),
    roleId: z.uuid("A valid role id is required.").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

const updateStatusSchema = z.object({
  isActive: z.boolean({ message: "isActive must be true or false." }),
});

export const UserValidation = {
  idParamSchema,
  listQuerySchema,
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
};
