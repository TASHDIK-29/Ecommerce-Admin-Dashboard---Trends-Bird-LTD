import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import type { TGenericErrorResponse } from "../interfaces/error.types";

/** Reads the offending field name(s) out of a Prisma error's `meta` bag. */
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

/**
 * Maps Prisma's error codes onto the status codes Section 4.2 requires, so a
 * duplicate slug returns 409 and a missing record returns 404 — never a 500,
 * and never a raw database error string in the response body.
 */
export const handlePrismaKnownError = (
  err: Prisma.PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  const targets = readTargets(err.meta);
  const field = targets[0] ?? "record";

  switch (err.code) {
    // Unique constraint failed — duplicate slug, SKU, email, permission name.
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

    // An operation depended on a record that was not found.
    case "P2025": {
      const cause =
        typeof err.meta?.cause === "string" ? err.meta.cause : "Record not found.";
      return {
        statusCode: StatusCodes.NOT_FOUND,
        message: cause,
        errorSources: [{ path: field, message: cause }],
      };
    }

    // Foreign key constraint failed — e.g. deleting a brand products still use.
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

    // Required relation violation.
    case "P2014": {
      return {
        statusCode: StatusCodes.CONFLICT,
        message: "This change would break a required relation between records.",
        errorSources: [{ path: field, message: "Required relation violated." }],
      };
    }

    // Value too long for the column.
    case "P2000": {
      return {
        statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
        message: `The value provided for ${humanise(field)} is too long.`,
        errorSources: [{ path: field, message: "Value is too long." }],
      };
    }

    // Null constraint violation.
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

/**
 * A malformed Prisma query is a programming error, but it must still not leak
 * the generated query text (which contains schema internals) to the client.
 */
export const handlePrismaValidationError = (): TGenericErrorResponse => ({
  statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
  message: "The request contained invalid or unexpected fields.",
  errorSources: [{ path: "request", message: "Invalid request payload." }],
});
