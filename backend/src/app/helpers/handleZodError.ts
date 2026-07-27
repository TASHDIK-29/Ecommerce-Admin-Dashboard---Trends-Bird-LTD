import { StatusCodes } from "http-status-codes";
import type { ZodError } from "zod";

import type { TErrorSource, TGenericErrorResponse } from "../interfaces/error.types";

/**
 * Turns a Zod failure into the API's standard error shape.
 *
 * Section 4.2 allows 400 or 422 for validation failures; this project uses
 * 422 throughout so that 400 stays reserved for malformed requests that never
 * reach a schema (bad JSON, missing multipart body).
 */
export const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSource[] = err.issues.map((issue) => ({
    // Drop the leading "body" / "params" / "query" segment so the frontend can
    // map the error straight onto its form field.
    path: issue.path.join(".") || "request",
    message: issue.message,
  }));

  return {
    statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
    message: "Validation failed",
    errorSources,
  };
};
