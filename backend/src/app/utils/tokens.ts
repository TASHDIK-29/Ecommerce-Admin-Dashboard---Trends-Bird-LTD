import crypto from "node:crypto";

import type { User } from "@prisma/client";

import { envVars } from "../config/env";
import { prisma } from "../config/prisma";
import { generateToken } from "./jwt";
import { durationToMs } from "./cookies";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  /** Id of the stored row backing `refreshToken`, for rotation bookkeeping. */
  refreshTokenId: string;
}

export interface TokenContext {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Refresh tokens are stored hashed, never in plain text.
 *
 * SHA-256 rather than bcrypt is the right tool here: the token is already
 * high-entropy random data, so there is nothing to brute force, and lookups
 * happen on every refresh where bcrypt's deliberate slowness would hurt.
 */
export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateCsrfToken = (): string =>
  crypto.randomBytes(32).toString("hex");

/**
 * Issues a fresh access/refresh pair and records the refresh token so it can
 * be revoked later.
 *
 * The refresh JWT carries the id of its own database row, which is what lets
 * `logout` and rotation invalidate one specific session rather than every
 * session a user has.
 */
export const issueTokens = async (
  user: Pick<User, "id" | "email">,
  context: TokenContext = {},
): Promise<IssuedTokens> => {
  const accessToken = generateToken(
    { userId: user.id, email: user.email },
    envVars.JWT.ACCESS_SECRET,
    envVars.JWT.ACCESS_EXPIRES,
  );

  const expiresAt = new Date(Date.now() + durationToMs(envVars.JWT.REFRESH_EXPIRES));

  // The row id is minted up front so it can be embedded in the very token it
  // describes, keeping this to a single insert.
  const tokenId = crypto.randomUUID();

  const refreshToken = generateToken(
    { userId: user.id, email: user.email, tokenId },
    envVars.JWT.REFRESH_SECRET,
    envVars.JWT.REFRESH_EXPIRES,
  );

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    },
  });

  return {
    accessToken,
    refreshToken,
    csrfToken: generateCsrfToken(),
    refreshTokenId: tokenId,
  };
};

/** Revokes every live refresh token a user holds. */
export const revokeAllUserTokens = async (userId: string): Promise<number> => {
  const result = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
};
