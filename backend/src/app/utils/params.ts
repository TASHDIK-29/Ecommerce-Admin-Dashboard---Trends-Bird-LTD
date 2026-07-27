import type { Request } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";

export const getParam = (req: Request, name: string): string => {
  const value = req.params[name];

  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Missing route parameter "${name}".`,
      [{ path: name, message: "This route parameter is required." }],
    );
  }

  return value;
};
