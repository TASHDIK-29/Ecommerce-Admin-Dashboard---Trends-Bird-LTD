import { StatusCodes } from "http-status-codes";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { envVars } from "../../config/env";
import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import { durationToMs } from "../../utils/cookies";
import { verifyToken } from "../../utils/jwt";
import { comparePassword, hashPassword } from "../../utils/password";
import {
  hashToken,
  issueTokens,
  revokeAllUserTokens,
  type TokenContext,
} from "../../utils/tokens";
import { INVALID_CREDENTIALS_MESSAGE, sessionUserSelect } from "./auth.constant";
import type {
  IChangePasswordPayload,
  ILoginPayload,
  ILoginResult,
  ISessionUser,
} from "./auth.interface";

/**
 * A real bcrypt hash of a value nobody knows, compared against when the email
 * does not exist. Without it, a missing account returns noticeably faster than
 * a wrong password and the "same error for both" rule leaks through timing.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.n0KBd/RQ2m0S8xTz4uZ0hE8b8Q1Ff9G";

/** The shape `sessionUserSelect` returns, before flattening. */
interface SessionQueryResult {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  avatarId: string | null;
  isActive: boolean;
  role: {
    id: string;
    name: string;
    status: string;
    permissions: { permission: { name: string } }[];
  };
}

const toSessionUser = (user: SessionQueryResult): ISessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  gender: user.gender,
  avatarId: user.avatarId,
  isActive: user.isActive,
  role: {
    id: user.role.id,
    name: user.role.name,
    status: user.role.status,
  },
  permissions: user.role.permissions.map((link) => link.permission.name).sort(),
});

const login = async (
  payload: ILoginPayload,
  context: TokenContext = {},
): Promise<ILoginResult> => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { ...sessionUserSelect, password: true, isDeleted: true },
  });


  if (!user || user.isDeleted) {
    await comparePassword(payload.password, DUMMY_HASH);
    throw new AppError(StatusCodes.UNAUTHORIZED, INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await comparePassword(payload.password, user.password);
  if (!passwordMatches) {
    throw new AppError(StatusCodes.UNAUTHORIZED, INVALID_CREDENTIALS_MESSAGE);
  }

  
  if (!user.isActive) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "This account has been deactivated. Contact an administrator.",
    );
  }

  const tokens = await issueTokens({ id: user.id, email: user.email }, context);

  return { tokens, user: toSessionUser(user) };
};


const refreshSession = async (
  refreshToken: string,
  context: TokenContext = {},
): Promise<ILoginResult> => {
  let decoded;
  try {
    decoded = verifyToken(refreshToken, envVars.JWT.REFRESH_SECRET);
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Your session has expired. Please sign in again.");
    }
    if (error instanceof JsonWebTokenError) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Refresh token is invalid.");
    }
    throw error;
  }

  if (!decoded.tokenId) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Refresh token is invalid.");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: decoded.tokenId },
  });

  if (!stored || stored.tokenHash !== hashToken(refreshToken)) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Refresh token is invalid.");
  }

  if (stored.revokedAt) {
    await revokeAllUserTokens(stored.userId);
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "This session has been revoked. Please sign in again.",
    );
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Your session has expired. Please sign in again.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { ...sessionUserSelect, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    await revokeAllUserTokens(stored.userId);
    throw new AppError(StatusCodes.UNAUTHORIZED, "This account no longer exists.");
  }

  
  if (!user.isActive) {
    await revokeAllUserTokens(stored.userId);
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "This account has been deactivated.",
    );
  }

  const tokens = await issueTokens({ id: user.id, email: user.email }, context);

  
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedById: tokens.refreshTokenId },
  });

  return { tokens, user: toSessionUser(user) };
};


const logout = async (refreshToken?: string): Promise<void> => {
  if (!refreshToken) return;

  let decoded;
  try {
    decoded = verifyToken(refreshToken, envVars.JWT.REFRESH_SECRET);
  } catch {
    return;
  }

  if (!decoded.tokenId) return;

  await prisma.refreshToken.updateMany({
    where: { id: decoded.tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

const getSession = async (userId: string): Promise<ISessionUser> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: sessionUserSelect,
  });

  if (!user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "This account no longer exists.");
  }

  return toSessionUser(user);
};


const changePassword = async (
  userId: string,
  payload: IChangePasswordPayload,
): Promise<void> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "This account no longer exists.");
  }

  const matches = await comparePassword(payload.currentPassword, user.password);
  if (!matches) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "The current password is incorrect.",
      [{ path: "currentPassword", message: "Incorrect password." }],
    );
  }

  const hashed = await hashPassword(payload.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};


const purgeExpiredTokens = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - durationToMs(envVars.JWT.REFRESH_EXPIRES));
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return result.count;
};

export const AuthService = {
  login,
  refreshSession,
  logout,
  getSession,
  changePassword,
  purgeExpiredTokens,
};
