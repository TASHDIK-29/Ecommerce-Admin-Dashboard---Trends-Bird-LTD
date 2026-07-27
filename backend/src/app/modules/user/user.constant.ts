export const userSearchableFields = ["name", "email"] as const;

export const userSortableFields = [
  "name",
  "email",
  "isActive",
  "createdAt",
  "updatedAt",
] as const;

export const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  gender: true,
  avatarId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
} as const;
