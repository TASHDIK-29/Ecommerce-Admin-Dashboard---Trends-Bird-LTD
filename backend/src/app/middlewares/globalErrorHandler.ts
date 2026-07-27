import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

import { isDevelopment } from "../config/env";
import { AppError } from "../error/AppError";
import {
  handlePrismaKnownError,
  handlePrismaValidationError,
} from "../helpers/handlePrismaError";
import { handleZodError } from "../helpers/handleZodError";
import type { TErrorSource } from "../interfaces/error.types";

export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong.";
  let errorSources: TErrorSource[] = [];

  if (err instanceof ZodError) {
    const normalized = handleZodError(err);
    statusCode = normalized.statusCode;
    message = normalized.message;
    errorSources = normalized.errorSources;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const normalized = handlePrismaKnownError(err);
    statusCode = normalized.statusCode;
    message = normalized.message;
    errorSources = normalized.errorSources;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    const normalized = handlePrismaValidationError();
    statusCode = normalized.statusCode;
    message = normalized.message;
    errorSources = normalized.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = err.errorSources ?? [{ path: "request", message: err.message }];
  } else if (err instanceof Error) {
    message = isDevelopment ? err.message : "Something went wrong.";
    errorSources = [{ path: "request", message }];
  }

  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.error("[error]", err);
  }

  res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errorSources,
    stack: isDevelopment && err instanceof Error ? err.stack : null,
  });
};
