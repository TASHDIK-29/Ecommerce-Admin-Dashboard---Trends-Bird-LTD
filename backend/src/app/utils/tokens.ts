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
  refreshTokenId: string;
}

export interface TokenContext {
  userAgent?: string;
  ipAddress?: string;
}

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateCsrfToken = (): string =>
  crypto.randomBytes(32).toString("hex");

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

export const revokeAllUserTokens = async (userId: string): Promise<number> => {
  const result = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
};
