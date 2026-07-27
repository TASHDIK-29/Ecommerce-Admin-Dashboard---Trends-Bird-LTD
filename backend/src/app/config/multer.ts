import multer from "multer";

import { envVars } from "./env";

export const UPLOAD_FIELD_MANY = "files";
export const UPLOAD_FIELD_ONE = "file";
export const MAX_FILES_PER_REQUEST = 10;

export const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: envVars.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_FILES_PER_REQUEST,
  },
});

export const uploadHandler = multerUpload.fields([
  { name: UPLOAD_FIELD_MANY, maxCount: MAX_FILES_PER_REQUEST },
  { name: UPLOAD_FIELD_ONE, maxCount: 1 },
]);
