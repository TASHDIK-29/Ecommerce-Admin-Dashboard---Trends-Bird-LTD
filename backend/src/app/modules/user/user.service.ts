import { StatusCodes } from "http-status-codes";

import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import type { AuthUser } from "../../interfaces/auth.types";
import { assertUserChangeKeepsAManager } from "../../utils/accessControl";
import { buildListQuery, buildMeta } from "../../utils/buildListQuery";
import { hashPassword } from "../../utils/password";
import { revokeAllUserTokens } from "../../utils/tokens";
import type {
  ICreateUserPayload,
  IUpdateStatusPayload,
  IUpdateUserPayload,
  IUserListQuery,
} from "./user.interface";
import { userSearchableFields, userSelect, userSortableFields } from "./user.constant";

const assertNotSelfEscalation = (
  actor: AuthUser,
  targetId: string,
  payload: { roleId?: string; isActive?: boolean },
): void => {
  if (actor.id !== targetId) return;

  if (payload.roleId !== undefined) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You cannot change your own role.",
      [{ path: "roleId", message: "Self role changes are not permitted." }],
    );
  }

  if (payload.isActive !== undefined) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You cannot change your own active status.",
      [{ path: "isActive", message: "Self status changes are not permitted." }],
    );
  }
};

const assertRoleAssignable = async (roleId: string): Promise<void> => {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, status: true, name: true },
  });

  if (!role) {
    throw new AppError(StatusCodes.UNPROCESSABLE_ENTITY, "The selected role does not exist.", [
      { path: "roleId", message: "No role with this id." },
    ]);
  }

  if (role.status === "INACTIVE") {
    throw new AppError(
      StatusCodes.UNPROCESSABLE_ENTITY,
      `The role "${role.name}" is inactive and cannot be assigned.`,
      [{ path: "roleId", message: "Choose an active role." }],
    );
  }
};

const assertEmailAvailable = async (email: string, excludeUserId?: string): Promise<void> => {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeleted: true },
  });

  if (!existing || existing.id === excludeUserId) return;

  throw new AppError(
    StatusCodes.CONFLICT,
    existing.isDeleted
      ? "This email belongs to a deleted account and cannot be reused."
      : "A user with this email already exists.",
    [{ path: "email", message: "This email is already taken." }],
  );
};

const loadUserOrThrow = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, name: true, email: true, isActive: true, roleId: true },
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found.");
  }

  return user;
};

const createUser = async (payload: ICreateUserPayload) => {
  await assertEmailAvailable(payload.email);
  await assertRoleAssignable(payload.roleId);

  return prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: await hashPassword(payload.password),
      phone: payload.phone,
      gender: payload.gender,
      avatarId: payload.avatarId,
      roleId: payload.roleId,
      isActive: payload.isActive ?? true,
    },
    select: userSelect,
  });
};

const getUsers = async (query: IUserListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: userSearchableFields,
    sortableFields: userSortableFields,
    filters: {
      roleId: { type: "string" },
      isActive: { type: "boolean" },
    },
    defaultSort: { createdAt: "desc" },
  });

  const scopedWhere = { ...where, isDeleted: false };

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({ where: scopedWhere, orderBy, skip, take, select: userSelect }),
    prisma.user.count({ where: scopedWhere }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { id, isDeleted: false },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found.");
  }

  return user;
};

const updateUser = async (id: string, payload: IUpdateUserPayload, actor: AuthUser) => {
  const user = await loadUserOrThrow(id);

  assertNotSelfEscalation(actor, id, payload);

  if (payload.email && payload.email !== user.email) {
    await assertEmailAvailable(payload.email, id);
  }

  if (payload.roleId && payload.roleId !== user.roleId) {
    await assertRoleAssignable(payload.roleId);
    await assertUserChangeKeepsAManager(id);
  }

  if (payload.isActive === false && user.isActive) {
    await assertUserChangeKeepsAManager(id);
  }

  const password = payload.password ? await hashPassword(payload.password) : undefined;
  const endsSession = payload.isActive === false || Boolean(payload.password);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id },
      data: {
        name: payload.name,
        email: payload.email,
        password,
        phone: payload.phone,
        gender: payload.gender,
        avatarId: payload.avatarId,
        roleId: payload.roleId,
        isActive: payload.isActive,
      },
      select: userSelect,
    });

    if (endsSession) {
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return result;
  });

  return updated;
};

const updateStatus = async (id: string, payload: IUpdateStatusPayload, actor: AuthUser) => {
  const user = await loadUserOrThrow(id);

  assertNotSelfEscalation(actor, id, payload);

  if (!payload.isActive && user.isActive) {
    await assertUserChangeKeepsAManager(id);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: payload.isActive },
    select: userSelect,
  });

  if (!payload.isActive) {
    await revokeAllUserTokens(id);
  }

  return updated;
};

const deleteUser = async (id: string, actor: AuthUser) => {
  const user = await loadUserOrThrow(id);

  if (actor.id === id) {
    throw new AppError(StatusCodes.FORBIDDEN, "You cannot delete your own account.", [
      { path: "id", message: "Self deletion is not permitted." },
    ]);
  }

  await assertUserChangeKeepsAManager(id);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
    });

    await tx.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  return { id: user.id, email: user.email, deleted: "soft" };
};

export const UserService = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateStatus,
  deleteUser,
};
