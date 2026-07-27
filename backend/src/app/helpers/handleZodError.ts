import { StatusCodes } from "http-status-codes";
import type { ZodError } from "zod";

import type { TErrorSource, TGenericErrorResponse } from "../interfaces/error.types";

export const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSource[] = err.issues.map((issue) => ({
    path: issue.path.join(".") || "request",
    message: issue.message,
  }));

  return {
    statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
    message: "Validation failed",
    errorSources,
  };
};
