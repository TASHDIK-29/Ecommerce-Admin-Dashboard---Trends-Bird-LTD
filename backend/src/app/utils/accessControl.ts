import { StatusCodes } from "http-status-codes";

import { prisma } from "../config/prisma";
import { AppError } from "../error/AppError";

export const ROLE_MANAGE_PERMISSION = "role:update";

interface ManagerScope {
  excludeRoleId?: string;
  excludeUserId?: string;
}

export const countRoleManagers = ({
  excludeRoleId,
  excludeUserId,
}: ManagerScope = {}): Promise<number> =>
  prisma.role.count({
    where: {
      ...(excludeRoleId ? { id: { not: excludeRoleId } } : {}),
      status: "ACTIVE",
      permissions: { some: { permission: { name: ROLE_MANAGE_PERMISSION } } },
      users: {
        some: {
          isActive: true,
          isDeleted: false,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
      },
    },
  });

const lockoutError = (path: string): AppError =>
  new AppError(
    StatusCodes.CONFLICT,
    `This change would leave nobody able to manage roles. At least one active role holding "${ROLE_MANAGE_PERMISSION}" must have an active user.`,
    [
      {
        path,
        message: `"${ROLE_MANAGE_PERMISSION}" must remain with an active user on some role.`,
      },
    ],
  );

export const assertRoleChangeKeepsAManager = async (
  roleId: string,
  nextHasRoleUpdate: boolean,
  nextIsActive: boolean,
): Promise<void> => {
  const activeUsers = await prisma.user.count({
    where: { roleId, isActive: true, isDeleted: false },
  });

  if (nextHasRoleUpdate && nextIsActive && activeUsers > 0) return;

  const others = await countRoleManagers({ excludeRoleId: roleId });
  if (others > 0) return;

  throw lockoutError("permissionIds");
};

export const assertUserChangeKeepsAManager = async (userId: string): Promise<void> => {
  const others = await countRoleManagers({ excludeUserId: userId });
  if (others > 0) return;

  throw lockoutError("id");
};
