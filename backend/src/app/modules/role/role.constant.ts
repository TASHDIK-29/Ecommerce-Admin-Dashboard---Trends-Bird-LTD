export const roleSearchableFields = ["name", "description"] as const;

export const roleSortableFields = ["name", "status", "createdAt", "updatedAt"] as const;

export const roleListSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true, permissions: true } },
} as const;

export const roleDetailSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true } },
  permissions: {
    select: {
      assignedAt: true,
      permission: {
        select: {
          id: true,
          name: true,
          action: true,
          description: true,
          group: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  },
} as const;
