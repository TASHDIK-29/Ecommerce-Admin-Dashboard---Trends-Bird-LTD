import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import type { TGenericErrorResponse } from "../interfaces/error.types";

const readTargets = (meta: unknown): string[] => {
  if (!meta || typeof meta !== "object") return [];

  const target = (meta as { target?: unknown }).target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];

  const fieldName = (meta as { field_name?: unknown }).field_name;
  if (typeof fieldName === "string") return [fieldName];

  const modelName = (meta as { modelName?: unknown }).modelName;
  if (typeof modelName === "string") return [modelName];

  return [];
};

const humanise = (field: string): string =>
  field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();

export const handlePrismaKnownError = (
  err: Prisma.PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  const targets = readTargets(err.meta);
  const field = targets[0] ?? "record";

  switch (err.code) {
    case "P2002": {
      const label = targets.length > 0 ? targets.map(humanise).join(", ") : "value";
      return {
        statusCode: StatusCodes.CONFLICT,
        message: `A record with this ${label} already exists.`,
        errorSources: (targets.length > 0 ? targets : ["record"]).map((t) => ({
          path: t,
          message: `This ${humanise(t)} is already taken.`,
        })),
      };
    }

    case "P2025": {
      const cause =
        typeof err.meta?.cause === "string" ? err.meta.cause : "Record not found.";
      return {
        statusCode: StatusCodes.NOT_FOUND,
        message: cause,
        errorSources: [{ path: field, message: cause }],
      };
    }

    case "P2003": {
      return {
        statusCode: StatusCodes.CONFLICT,
        message: `This record is still referenced by other records and cannot be changed.`,
        errorSources: [
          {
            path: field,
            message: "Referenced by existing records.",
          },
        ],
      };
    }

    case "P2014": {
      return {
        statusCode: StatusCodes.CONFLICT,
        message: "This change would break a required relation between records.",
        errorSources: [{ path: field, message: "Required relation violated." }],
      };
    }

    case "P2000": {
      return {
        statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
        message: `The value provided for ${humanise(field)} is too long.`,
        errorSources: [{ path: field, message: "Value is too long." }],
      };
    }

    case "P2011": {
      return {
        statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
        message: `${humanise(field)} is required.`,
        errorSources: [{ path: field, message: "This field is required." }],
      };
    }

    default:
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        message: "The request could not be completed.",
        errorSources: [{ path: "request", message: "Database request failed." }],
      };
  }
};

export const handlePrismaValidationError = (): TGenericErrorResponse => ({
  statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
  message: "The request contained invalid or unexpected fields.",
  errorSources: [{ path: "request", message: "Invalid request payload." }],
});
