export const MODULES = [
  "dashboard",
  "permission",
  "role",
  "user",
  "media",
  "category",
  "brand",
  "attribute",
  "product",
] as const;

export type ModuleName = (typeof MODULES)[number];

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

export const can = (permissions: string[], permission: string): boolean =>
  permissions.includes(permission);

export const canAll = (permissions: string[], required: string[]): boolean =>
  required.every((permission) => permissions.includes(permission));

export const canAny = (permissions: string[], required: string[]): boolean =>
  required.some((permission) => permissions.includes(permission));
