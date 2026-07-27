import type { Request } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";
import type { AuthUser } from "../interfaces/auth.types";

export const getActor = (req: Request): AuthUser => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required.");
  }
  return req.user;
};
