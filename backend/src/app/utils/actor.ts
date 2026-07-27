import type { Request } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";
import type { AuthUser } from "../interfaces/auth.types";

/**
 * Reads the authenticated user off the request.
 *
 * `req.user` is optional at the type level because public routes run without
 * it. Rather than sprinkling non-null assertions through the controllers, this
 * narrows it once and fails loudly with a 401 if a route somehow ran outside
 * the guard — a missing guard becomes an obvious error, not a silent
 * `undefined` reaching business logic.
 */
export const getActor = (req: Request): AuthUser => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required.");
  }
  return req.user;
};
