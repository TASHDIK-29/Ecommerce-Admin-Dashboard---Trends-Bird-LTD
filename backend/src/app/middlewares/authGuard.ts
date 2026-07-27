import type { Request, RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import { envVars } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../error/AppError";
import type { AuthSource } from "../interfaces/auth.types";
import { ACCESS_TOKEN_COOKIE } from "../utils/cookies";
import { verifyToken } from "../utils/jwt";

/**
 * The only routes that may run without a valid access token.
 *
 * Written as an explicit allowlist rather than an opt-in decorator: the guard
 * is mounted on the whole `/api/v1` tree, so a newly added route is protected
 * by default and opening one up is a visible, reviewable edit to this file.
 */
const PUBLIC_ROUTES = new Set<string>([
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/logout",
]);

const isPublicRoute = (req: Request): boolean => {
  // `req.path` here is relative to the `/api/v1` mount, e.g. "/auth/login".
  const path = req.path.replace(/\/+$/, "") || "/";
  return PUBLIC_ROUTES.has(`${req.method.toUpperCase()} ${path}`);
};

/**
 * Pulls the access token off the request.
 *
 * The documented strategy is HttpOnly cookies. A Bearer header is also
 * accepted so the API can be exercised directly from Postman, which the
 * assignment says reviewers will do.
 */
const extractToken = (
  req: Request,
): { token: string; source: AuthSource } | undefined => {
  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return { token: cookieToken, source: "cookie" };
  }

  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token.length > 0) return { token, source: "bearer" };
  }

  return undefined;
};

/**
 * Authenticates every request that is not on the public allowlist.
 *
 * Returns 401 when the token is missing, malformed, expired, wrongly signed,
 * or the account is inactive or deleted — exactly the list in Section 4.2.
 *
 * The user's role and permissions are read from the database on each request
 * rather than trusted from the token's claims. That costs one indexed query,
 * and buys correctness: revoking a permission or deactivating an account takes
 * effect on the next request instead of whenever the token happens to expire.
 */
export const authGuard: RequestHandler = async (req, _res, next) => {
  try {
    if (isPublicRoute(req)) {
      next();
      return;
    }

    const extracted = extractToken(req);
    if (!extracted) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "Authentication required. No access token was provided.",
      );
    }

    let decoded;
    try {
      decoded = verifyToken(extracted.token, envVars.JWT.ACCESS_SECRET);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppError(
          StatusCodes.UNAUTHORIZED,
          "Access token has expired. Refresh the session and try again.",
        );
      }
      if (error instanceof JsonWebTokenError) {
        throw new AppError(StatusCodes.UNAUTHORIZED, "Access token is invalid.");
      }
      throw error;
    }

    if (!decoded.userId) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Access token is invalid.");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isDeleted: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            status: true,
            permissions: {
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });

    // A deleted or deactivated account is a 401, not a 403: the credential
    // itself is no longer good, regardless of what the route needs.
    if (!user || user.isDeleted) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "This account no longer exists.");
    }

    if (!user.isActive) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "This account has been deactivated.");
    }

    if (user.role.status === "INACTIVE") {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        "The role assigned to this account is inactive.",
      );
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.role.id,
      roleName: user.role.name,
      permissions: user.role.permissions.map((link) => link.permission.name),
      authSource: extracted.source,
    };

    next();
  } catch (error) {
    next(error);
  }
};
