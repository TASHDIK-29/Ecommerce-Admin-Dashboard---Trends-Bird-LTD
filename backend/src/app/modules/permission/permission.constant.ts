export const STANDARD_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "watch",
  "upload",
  "write",
  "approve",
  "status",
] as const;

export const permissionGroupSearchableFields = ["name", "slug", "description"] as const;

export const permissionSearchableFields = ["name", "action", "description"] as const;

export const permissionGroupSortableFields = ["name", "slug", "createdAt", "updatedAt"] as const;

export const permissionSortableFields = ["name", "action", "createdAt", "updatedAt"] as const;

export const permissionSelect = {
  id: true,
  name: true,
  action: true,
  description: true,
  groupId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const groupWithPermissionsSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  permissions: {
    select: permissionSelect,
    orderBy: { action: "asc" },
  },
} as const;
