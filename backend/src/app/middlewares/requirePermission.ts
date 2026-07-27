import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";

export const requireAnyPermission =
  (...accepted: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Authentication required."));
      return;
    }

    const held = new Set(req.user.permissions);
    if (accepted.some((permission) => held.has(permission))) {
      next();
      return;
    }

    next(
      new AppError(
        StatusCodes.FORBIDDEN,
        `You do not have permission to perform this action. One of these is required: ${accepted.join(", ")}.`,
        accepted.map((permission) => ({
          path: "permission",
          message: `Missing permission "${permission}".`,
        })),
      ),
    );
  };

export const requirePermission =
  (...required: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
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
