import { StatusCodes } from "http-status-codes";
import sharp from "sharp";

import { AppError } from "../error/AppError";

export type DetectedKind = "IMAGE" | "VIDEO";

export interface InspectedFile {
  kind: DetectedKind;
  mimeType: string;
  width?: number;
  height?: number;
}

const IMAGE_FORMATS: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const ascii = (buffer: Buffer, start: number, length: number): string =>
  buffer.subarray(start, start + length).toString("ascii");

const detectVideo = (buffer: Buffer): string | undefined => {
  if (buffer.length < 16) return undefined;

  if (ascii(buffer, 4, 4) === "ftyp") {
    const brand = ascii(buffer, 8, 4);
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }

  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return "video/webm";
  }

  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "AVI ") {
    return "video/x-msvideo";
  }

  return undefined;
};

const rejected = (fileName: string, reason: string): AppError =>
  new AppError(
    StatusCodes.UNPROCESSABLE_ENTITY,
    `"${fileName}" is not an accepted file. ${reason}`,
    [{ path: "file", message: reason }],
  );

export const inspectFile = async (
  buffer: Buffer,
  fileName: string,
): Promise<InspectedFile> => {
  if (buffer.length === 0) {
    throw rejected(fileName, "The file is empty.");
  }

  try {
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format ?? "";
    const mimeType = IMAGE_FORMATS[format];

    if (mimeType) {
      return {
        kind: "IMAGE",
        mimeType,
        width: metadata.width,
        height: metadata.height,
      };
    }

    if (format) {
      throw rejected(fileName, `Images of type "${format}" are not accepted.`);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
  }

  const videoMime = detectVideo(buffer);
  if (videoMime) {
    return { kind: "VIDEO", mimeType: videoMime };
  }

  throw rejected(
    fileName,
    "Only JPEG, PNG, WebP, GIF, AVIF images and MP4, WebM, MOV, AVI videos are accepted.",
  );
};

export const generateThumbnail = async (buffer: Buffer): Promise<Buffer> =>
  sharp(buffer)
    .rotate()
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
