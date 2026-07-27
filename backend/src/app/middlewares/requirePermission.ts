import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";

/**
 * The second guard (Section 4.2): reads the permission a route declares and
 * compares it against the permissions the caller's role holds.
 *
 * Runs after `authGuard`, so `req.user` is populated and its `permissions`
 * array reflects the database as of *this* request. A missing permission is a
 * 403 — the credential is fine, the authority is not.
 *
 * Listing several permissions requires all of them.
 */
export const requirePermission =
  (...required: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      // Only reachable if a route were mounted outside the global auth guard.
      // Failing closed here means a wiring mistake can never expose data.
      next(
        new AppError(
          StatusCodes.UNAUTHORIZED,
          "Authentication required.",
        ),
      );
      return;
    }

    const held = new Set(req.user.permissions);
    const missing = required.filter((permission) => !held.has(permission));

    if (missing.length > 0) {
      next(
        new AppError(
          StatusCodes.FORBIDDEN,
          `You do not have permission to perform this action. Required: ${missing.join(", ")}.`,
          missing.map((permission) => ({
            path: "permission",
            message: `Missing permission "${permission}".`,
          })),
        ),
      );
      return;
    }

    next();
  };
