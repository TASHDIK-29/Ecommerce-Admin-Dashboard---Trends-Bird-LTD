import { StatusCodes } from "http-status-codes";
import type { MulterError } from "multer";

import { envVars } from "../config/env";
import { MAX_FILES_PER_REQUEST, UPLOAD_FIELD_MANY } from "../config/multer";
import type { TGenericErrorResponse } from "../interfaces/error.types";

export const handleMulterError = (err: MulterError): TGenericErrorResponse => {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return {
        statusCode: StatusCodes.REQUEST_TOO_LONG,
        message: `Each file must be at most ${envVars.MAX_FILE_SIZE_MB} MB.`,
        errorSources: [{ path: err.field ?? "file", message: "File is too large." }],
      };

    case "LIMIT_FILE_COUNT":
      return {
        statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
        message: `At most ${MAX_FILES_PER_REQUEST} files may be uploaded in one request.`,
        errorSources: [{ path: "files", message: "Too many files." }],
      };

    case "LIMIT_UNEXPECTED_FILE":
      return {
        statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
        message: `Unexpected file field "${err.field}". Use "${UPLOAD_FIELD_MANY}" or "file".`,
        errorSources: [{ path: err.field ?? "file", message: "Unexpected field name." }],
      };

    default:
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        message: "The uploaded file could not be processed.",
        errorSources: [{ path: err.field ?? "file", message: err.message }],
      };
  }
};
