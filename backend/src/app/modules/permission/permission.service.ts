import { StatusCodes } from "http-status-codes";

import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import { buildListQuery, buildMeta } from "../../utils/buildListQuery";
import { toSlug } from "../../utils/slug";
import {
  groupWithPermissionsSelect,
  permissionGroupSearchableFields,
  permissionGroupSortableFields,
  permissionSearchableFields,
  permissionSelect,
  permissionSortableFields,
} from "./permission.constant";
import type {
  ICreateGroupPayload,
  ICreatePermissionPayload,
  IListQuery,
  IUpdateGroupPayload,
  IUpdatePermissionPayload,
} from "./permission.interface";

const permissionName = (groupSlug: string, action: string): string =>
  `${groupSlug}:${action}`;

const unique = (values: string[]): string[] => [...new Set(values)];

const createGroup = async (payload: ICreateGroupPayload) => {
  const slug = toSlug(payload.name);
  const actions = unique(payload.actions);

  const clash = await prisma.permissionGroup.findFirst({
    where: { OR: [{ slug }, { name: payload.name }] },
    select: { id: true },
  });

  if (clash) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `A permission group named "${payload.name}" already exists.`,
      [{ path: "name", message: "This group name is already taken." }],
    );
  }

  return prisma.permissionGroup.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      permissions: {
        create: actions.map((action) => ({
          name: permissionName(slug, action),
          action,
          description: payload.description
            ? undefined
            : `Can ${action} ${payload.name.toLowerCase()}.`,
        })),
      },
    },
    select: groupWithPermissionsSelect,
  });
};

const getGroups = async (query: IListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: permissionGroupSearchableFields,
    sortableFields: permissionGroupSortableFields,
    defaultSort: { name: "asc" },
  });

  const [data, total] = await prisma.$transaction([
    prisma.permissionGroup.findMany({
      where,
      orderBy,
      skip,
      take,
      select: groupWithPermissionsSelect,
    }),
    prisma.permissionGroup.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

const getGroupById = async (id: string) => {
  const group = await prisma.permissionGroup.findUnique({
    where: { id },
    select: groupWithPermissionsSelect,
  });

  if (!group) {
    throw new AppError(StatusCodes.NOT_FOUND, "Permission group not found.");
  }

  return group;
};

const updateGroup = async (id: string, payload: IUpdateGroupPayload) => {
  const group = await prisma.permissionGroup.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, permissions: { select: { id: true, action: true } } },
  });

  if (!group) {
    throw new AppError(StatusCodes.NOT_FOUND, "Permission group not found.");
  }

  const nextName = payload.name ?? group.name;
  const nextSlug = toSlug(nextName);

  if (nextSlug !== group.slug) {
    const clash = await prisma.permissionGroup.findFirst({
      where: { OR: [{ slug: nextSlug }, { name: nextName }], NOT: { id } },
      select: { id: true },
    });

    if (clash) {
      throw new AppError(
        StatusCodes.CONFLICT,
        `A permission group named "${nextName}" already exists.`,
        [{ path: "name", message: "This group name is already taken." }],
      );
    }
  }

  const currentActions = group.permissions.map((permission) => permission.action);
  const desiredActions = payload.actions ? unique(payload.actions) : currentActions;

  const toCreate = desiredActions.filter((action) => !currentActions.includes(action));
  const toRemove = group.permissions.filter(
    (permission) => !desiredActions.includes(permission.action),
  );

  const toRename = group.permissions.filter(
    (permission) =>
      desiredActions.includes(permission.action) && nextSlug !== group.slug,
  );

  await prisma.$transaction([
    prisma.permissionGroup.update({
      where: { id },
      data: {
        name: nextName,
        slug: nextSlug,
        description: payload.description,
      },
    }),
    ...toRename.map((permission) =>
      prisma.permission.update({
        where: { id: permission.id },
        data: { name: permissionName(nextSlug, permission.action) },
      }),
    ),

    prisma.permission.deleteMany({
      where: { id: { in: toRemove.map((permission) => permission.id) } },
    }),
    prisma.permission.createMany({
      data: toCreate.map((action) => ({
        groupId: id,
        action,
        name: permissionName(nextSlug, action),
        description: `Can ${action} ${nextName.toLowerCase()}.`,
      })),
      skipDuplicates: true,
    }),
  ]);

  return getGroupById(id);
};

const deleteGroup = async (id: string) => {
  const group = await prisma.permissionGroup.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { permissions: true } } },
  });

  if (!group) {
    throw new AppError(StatusCodes.NOT_FOUND, "Permission group not found.");
  }

  await prisma.permissionGroup.delete({ where: { id } });

  return {
    id: group.id,
    name: group.name,
    deletedPermissions: group._count.permissions,
  };
};

const getPermissions = async (query: IListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: permissionSearchableFields,
    sortableFields: permissionSortableFields,
    filters: { groupId: { type: "string" } },
    defaultSort: { name: "asc" },
  });

  const [data, total] = await prisma.$transaction([
    prisma.permission.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        ...permissionSelect,
        group: { select: { id: true, name: true, slug: true } },
        _count: { select: { roles: true } },
      },
    }),
    prisma.permission.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

const getPermissionById = async (id: string) => {
  const permission = await prisma.permission.findUnique({
    where: { id },
    select: {
      ...permissionSelect,
      group: { select: { id: true, name: true, slug: true } },
      _count: { select: { roles: true } },
    },
  });

  if (!permission) {
    throw new AppError(StatusCodes.NOT_FOUND, "Permission not found.");
  }

  return permission;
};

const createPermission = async (payload: ICreatePermissionPayload) => {
  const group = await prisma.permissionGroup.findUnique({
    where: { id: payload.groupId },
    select: { id: true, name: true, slug: true },
  });

  if (!group) {
    throw new AppError(StatusCodes.NOT_FOUND, "Permission group not found.", [
      { path: "groupId", message: "No group with this id." },
    ]);
  }

  const name = permissionName(group.slug, payload.action);

  const clash = await prisma.permission.findUnique({
    where: { name },
    select: { id: true },
  });

  if (clash) {
    throw new AppError(StatusCodes.CONFLICT, `The permission "${name}" already exists.`, [
      { path: "action", message: "This action already exists in the group." },
    ]);
  }

  return prisma.permission.create({
    data: {
      name,
      action: payload.action,
      description: payload.description ?? `Can ${payload.action} ${group.name.toLowerCase()}.`,
      groupId: group.id,
    },
    select: permissionSelect,
  });
};

const updatePermission = async (id: string, payload: IUpdatePermissionPayload) => {
  const permission = await prisma.permission.findUnique({
    where: { id },
    select: { id: true, action: true, group: { select: { slug: true } } },
  });

  if (!permission) {
    throw new AppError(StatusCodes.NOT_FOUND, "Permission not found.");
  }

  const nextAction = payload.action ?? permission.action;
  const nextName = permissionName(permission.group.slug, nextAction);

  if (nextAction !== permission.action) {
    const clash = await prisma.permission.findUnique({
      where: { name: nextName },
      select: { id: true },
    });

    if (clash) {
      throw new AppError(StatusCodes.CONFLICT, `The permission "${nextName}" already exists.`, [
        { path: "action", message: "This action already exists in the group." },
      ]);
    }
  }

  return prisma.permission.update({
    where: { id },
    data: {
      action: nextAction,
      name: nextName,
      description: payload.description,
    },
    select: permissionSelect,
  });
};

const deletePermission = async (id: string) => {
  const permission = await prisma.permission.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { roles: true } } },
  });

  if (!permission) {
    throw new AppError(StatusCodes.NOT_FOUND, "Permission not found.");
  }

  await prisma.permission.delete({ where: { id } });

  return {
    id: permission.id,
    name: permission.name,
    revokedFromRoles: permission._count.roles,
  };
};

export const PermissionService = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  getPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
};
