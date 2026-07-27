import { StatusCodes } from "http-status-codes";

import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import {
  assertRoleChangeKeepsAManager,
  ROLE_MANAGE_PERMISSION,
} from "../../utils/accessControl";
import { buildListQuery, buildMeta } from "../../utils/buildListQuery";
import {
  roleDetailSelect,
  roleListSelect,
  roleSearchableFields,
  roleSortableFields,
} from "./role.constant";
import type {
  ICreateRolePayload,
  IModifyPermissionsPayload,
  IRoleListQuery,
  IUpdateRolePayload,
} from "./role.interface";

const unique = (values: string[]): string[] => [...new Set(values)];

const resolvePermissions = async (permissionIds: string[]) => {
  const ids = unique(permissionIds);
  if (ids.length === 0) return [];

  const found = await prisma.permission.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  if (found.length !== ids.length) {
    const foundIds = new Set(found.map((permission) => permission.id));
    const missing = ids.filter((id) => !foundIds.has(id));

    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      "One or more permissions do not exist.",
      missing.map((id) => ({ path: "permissionIds", message: `No permission with id ${id}.` })),
    );
  }

  return found;
};

const shapeRole = <T extends { permissions?: { assignedAt: Date; permission: unknown }[] }>(
  role: T,
) => {
  if (!role.permissions) return role;

  return {
    ...role,
    permissions: role.permissions.map((link) => link.permission),
  };
};

const createRole = async (payload: ICreateRolePayload) => {
  const clash = await prisma.role.findUnique({
    where: { name: payload.name },
    select: { id: true },
  });

  if (clash) {
    throw new AppError(StatusCodes.CONFLICT, `A role named "${payload.name}" already exists.`, [
      { path: "name", message: "This role name is already taken." },
    ]);
  }

  let permissionIds: string[] = [];

  if (payload.grantAll) {
    const all = await prisma.permission.findMany({ select: { id: true } });
    permissionIds = all.map((permission) => permission.id);
  } else if (payload.permissionIds?.length) {
    const resolved = await resolvePermissions(payload.permissionIds);
    permissionIds = resolved.map((permission) => permission.id);
  }

  const role = await prisma.role.create({
    data: {
      name: payload.name,
      description: payload.description,
      status: payload.status ?? "ACTIVE",
      permissions: {
        create: permissionIds.map((permissionId) => ({ permissionId })),
      },
    },
    select: roleDetailSelect,
  });

  return shapeRole(role);
};

const getRoles = async (query: IRoleListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: roleSearchableFields,
    sortableFields: roleSortableFields,
    filters: { status: { type: "enum", values: ["ACTIVE", "INACTIVE"] } },
    defaultSort: { name: "asc" },
  });

  const [rows, total] = await prisma.$transaction([
    prisma.role.findMany({ where, orderBy, skip, take, select: roleListSelect }),
    prisma.role.count({ where }),
  ]);

  const data = rows.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    status: role.status,
    isSystem: role.isSystem,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    userCount: role._count.users,
    permissionCount: role._count.permissions,
  }));

  return { data, meta: buildMeta(total, page, limit) };
};

const getRoleById = async (id: string) => {
  const role = await prisma.role.findUnique({ where: { id }, select: roleDetailSelect });

  if (!role) {
    throw new AppError(StatusCodes.NOT_FOUND, "Role not found.");
  }

  return shapeRole(role);
};

const loadRoleOrThrow = async (id: string) => {
  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      isSystem: true,
      permissions: { select: { permissionId: true, permission: { select: { name: true } } } },
    },
  });

  if (!role) {
    throw new AppError(StatusCodes.NOT_FOUND, "Role not found.");
  }

  return role;
};

const updateRole = async (id: string, payload: IUpdateRolePayload) => {
  const role = await loadRoleOrThrow(id);

  if (payload.name && payload.name !== role.name) {
    const clash = await prisma.role.findFirst({
      where: { name: payload.name, NOT: { id } },
      select: { id: true },
    });

    if (clash) {
      throw new AppError(StatusCodes.CONFLICT, `A role named "${payload.name}" already exists.`, [
        { path: "name", message: "This role name is already taken." },
      ]);
    }
  }

  if (role.isSystem && payload.status === "INACTIVE") {
    throw new AppError(
      StatusCodes.CONFLICT,
      `"${role.name}" is a system role and cannot be deactivated.`,
      [{ path: "status", message: "System roles must stay active." }],
    );
  }

  const nextStatus = payload.status ?? role.status;
  let nextPermissionIds: string[] | undefined;
  let nextHasRoleUpdate = role.permissions.some(
    (link) => link.permission.name === ROLE_MANAGE_PERMISSION,
  );

  if (payload.permissionIds) {
    const resolved = await resolvePermissions(payload.permissionIds);
    nextPermissionIds = resolved.map((permission) => permission.id);
    nextHasRoleUpdate = resolved.some(
      (permission) => permission.name === ROLE_MANAGE_PERMISSION,
    );
  }

  await assertRoleChangeKeepsAManager(id, nextHasRoleUpdate, nextStatus === "ACTIVE");

  await prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        status: payload.status,
      },
    });

    if (nextPermissionIds) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({
        data: nextPermissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        skipDuplicates: true,
      });
    }
  });

  return getRoleById(id);
};

const addPermissions = async (id: string, payload: IModifyPermissionsPayload) => {
  await loadRoleOrThrow(id);
  const resolved = await resolvePermissions(payload.permissionIds);

  await prisma.rolePermission.createMany({
    data: resolved.map((permission) => ({ roleId: id, permissionId: permission.id })),
    skipDuplicates: true,
  });

  return getRoleById(id);
};

const removePermissions = async (id: string, payload: IModifyPermissionsPayload) => {
  const role = await loadRoleOrThrow(id);
  const removing = new Set(unique(payload.permissionIds));

  const remaining = role.permissions.filter((link) => !removing.has(link.permissionId));
  const nextHasRoleUpdate = remaining.some(
    (link) => link.permission.name === ROLE_MANAGE_PERMISSION,
  );

  await assertRoleChangeKeepsAManager(id, nextHasRoleUpdate, role.status === "ACTIVE");

  const result = await prisma.rolePermission.deleteMany({
    where: { roleId: id, permissionId: { in: [...removing] } },
  });

  if (result.count === 0) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "None of those permissions are assigned to this role.",
      [{ path: "permissionIds", message: "No matching assignment to revoke." }],
    );
  }

  return getRoleById(id);
};

const grantAllPermissions = async (id: string) => {
  await loadRoleOrThrow(id);

  const all = await prisma.permission.findMany({ select: { id: true } });

  await prisma.rolePermission.createMany({
    data: all.map((permission) => ({ roleId: id, permissionId: permission.id })),
    skipDuplicates: true,
  });

  return getRoleById(id);
};

const deleteRole = async (id: string) => {
  const role = await loadRoleOrThrow(id);

  if (role.isSystem) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `"${role.name}" is a system role and cannot be deleted.`,
      [{ path: "id", message: "System roles are protected." }],
    );
  }

  const [activeUsers, deletedUsers] = await prisma.$transaction([
    prisma.user.count({ where: { roleId: id, isDeleted: false } }),
    prisma.user.count({ where: { roleId: id, isDeleted: true } }),
  ]);

  if (activeUsers > 0) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `This role cannot be deleted while ${activeUsers} user(s) still hold it. Reassign them first.`,
      [{ path: "id", message: `${activeUsers} user(s) hold this role.` }],
    );
  }

  if (deletedUsers > 0) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `This role is still referenced by ${deletedUsers} deleted user(s) and cannot be removed.`,
      [{ path: "id", message: `${deletedUsers} deleted user(s) reference this role.` }],
    );
  }

  await assertRoleChangeKeepsAManager(id, false, false);

  await prisma.role.delete({ where: { id } });

  return { id: role.id, name: role.name };
};

export const RoleService = {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  addPermissions,
  removePermissions,
  grantAllPermissions,
  deleteRole,
};
