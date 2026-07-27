import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";
import { envVars } from "./env";

let configured = false;

const ensureConfigured = (): void => {
  if (configured) return;

  const { CLOUD_NAME, API_KEY, API_SECRET } = envVars.CLOUDINARY;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new AppError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "File storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
      [{ path: "storage", message: "Cloudinary credentials are missing." }],
    );
  }

  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });

  configured = true;
};

export const isStorageConfigured = (): boolean =>
  Boolean(
    envVars.CLOUDINARY.CLOUD_NAME &&
      envVars.CLOUDINARY.API_KEY &&
      envVars.CLOUDINARY.API_SECRET,
  );

export interface UploadedAsset {
  publicId: string;
  url: string;
  bytes: number;
  width?: number;
  height?: number;
}

export const uploadBuffer = (
  buffer: Buffer,
  options: { folder?: string; resourceType: "image" | "video"; publicId?: string },
): Promise<UploadedAsset> => {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? envVars.CLOUDINARY.FOLDER,
        resource_type: options.resourceType,
        public_id: options.publicId,
        overwrite: false,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(
            new AppError(
              StatusCodes.BAD_GATEWAY,
              "Upload to file storage failed.",
              [{ path: "file", message: error?.message ?? "Unknown storage error." }],
            ),
          );
          return;
        }

        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );

    stream.end(buffer);
  });
};

export const destroyAsset = async (
  publicId: string,
  resourceType: "image" | "video" = "image",
): Promise<void> => {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export const destroyAssetQuietly = async (
  publicId: string,
  resourceType: "image" | "video" = "image",
): Promise<void> => {
  try {
    await destroyAsset(publicId, resourceType);
  } catch {
    return;
  }
};
