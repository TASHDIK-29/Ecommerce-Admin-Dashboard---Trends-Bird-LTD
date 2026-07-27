import { StatusCodes } from "http-status-codes";

import { destroyAssetQuietly, uploadBuffer } from "../../config/cloudinary";
import { envVars } from "../../config/env";
import { prisma } from "../../config/prisma";
import { AppError } from "../../error/AppError";
import { buildListQuery, buildMeta } from "../../utils/buildListQuery";
import { generateThumbnail, inspectFile } from "../../utils/fileInspector";
import { toSlug } from "../../utils/slug";
import { mediaSearchableFields, mediaSelect, mediaSortableFields } from "./media.constant";
import type {
  IMediaListQuery,
  IUpdateMediaPayload,
  IUploadedFile,
} from "./media.interface";

interface PreparedUpload {
  fileName: string;
  kind: "IMAGE" | "VIDEO";
  mimeType: string;
  width?: number;
  height?: number;
  buffer: Buffer;
  size: number;
}

const baseName = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return toSlug(withoutExtension).slice(0, 60) || "file";
};

const uploadFiles = async (files: IUploadedFile[], uploaderId: string) => {
  if (files.length === 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `No file was received. Send one or more files in the "files" field.`,
      [{ path: "files", message: "At least one file is required." }],
    );
  }

  const prepared: PreparedUpload[] = [];

  for (const file of files) {
    const inspected = await inspectFile(file.buffer, file.originalname);
    prepared.push({
      fileName: file.originalname,
      kind: inspected.kind,
      mimeType: inspected.mimeType,
      width: inspected.width,
      height: inspected.height,
      buffer: file.buffer,
      size: file.size,
    });
  }

  const uploaded: { publicId: string; resourceType: "image" | "video" }[] = [];

  try {
    const rows = [];

    for (const item of prepared) {
      const resourceType = item.kind === "IMAGE" ? "image" : "video";

      const asset = await uploadBuffer(item.buffer, {
        resourceType,
        publicId: `${baseName(item.fileName)}-${Date.now()}`,
      });
      uploaded.push({ publicId: asset.publicId, resourceType });

      let thumbnailUrl: string | undefined;
      let thumbnailPath: string | undefined;

      if (item.kind === "IMAGE") {
        const thumbnailBuffer = await generateThumbnail(item.buffer);
        const thumbnail = await uploadBuffer(thumbnailBuffer, {
          resourceType: "image",
          folder: `${envVars.CLOUDINARY.FOLDER}/thumbnails`,
          publicId: `${baseName(item.fileName)}-${Date.now()}-thumb`,
        });
        uploaded.push({ publicId: thumbnail.publicId, resourceType: "image" });
        thumbnailUrl = thumbnail.url;
        thumbnailPath = thumbnail.publicId;
      }

      rows.push({
        fileName: item.fileName,
        storedPath: asset.publicId,
        url: asset.url,
        thumbnailUrl,
        thumbnailPath,
        mimeType: item.mimeType,
        type: item.kind,
        size: item.size,
        width: item.width ?? asset.width,
        height: item.height ?? asset.height,
        uploadedById: uploaderId,
      });
    }

    await prisma.media.createMany({ data: rows });

    return prisma.media.findMany({
      where: { storedPath: { in: rows.map((row) => row.storedPath) } },
      select: mediaSelect,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    await Promise.all(
      uploaded.map((asset) => destroyAssetQuietly(asset.publicId, asset.resourceType)),
    );
    throw error;
  }
};

const getMediaList = async (query: IMediaListQuery) => {
  const { where, orderBy, skip, take, page, limit } = buildListQuery(query, {
    searchableFields: mediaSearchableFields,
    sortableFields: mediaSortableFields,
    filters: { type: { type: "enum", values: ["IMAGE", "VIDEO"] } },
    defaultSort: { createdAt: "desc" },
  });

  const [data, total] = await prisma.$transaction([
    prisma.media.findMany({ where, orderBy, skip, take, select: mediaSelect }),
    prisma.media.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
};

const getMediaById = async (id: string) => {
  const media = await prisma.media.findUnique({ where: { id }, select: mediaSelect });

  if (!media) {
    throw new AppError(StatusCodes.NOT_FOUND, "Media not found.");
  }

  return media;
};

const updateMedia = async (id: string, payload: IUpdateMediaPayload) => {
  await getMediaById(id);

  return prisma.media.update({
    where: { id },
    data: { altText: payload.altText, title: payload.title },
    select: mediaSelect,
  });
};

const countAttachments = async (id: string): Promise<number> =>
  prisma.user.count({ where: { avatarId: id } });

const deleteMedia = async (id: string, force: boolean) => {
  const media = await prisma.media.findUnique({
    where: { id },
    select: { id: true, fileName: true, storedPath: true, thumbnailPath: true, type: true },
  });

  if (!media) {
    throw new AppError(StatusCodes.NOT_FOUND, "Media not found.");
  }

  const attachments = await countAttachments(id);

  if (attachments > 0 && !force) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `This asset is attached to ${attachments} record(s). Detach it first, or repeat the request with ?force=true to detach automatically.`,
      [{ path: "id", message: `${attachments} record(s) still reference this asset.` }],
    );
  }

  await prisma.$transaction(async (tx) => {
    if (attachments > 0) {
      await tx.user.updateMany({ where: { avatarId: id }, data: { avatarId: null } });
    }
    await tx.media.delete({ where: { id } });
  });

  const resourceType = media.type === "VIDEO" ? "video" : "image";
  await destroyAssetQuietly(media.storedPath, resourceType);
  if (media.thumbnailPath) {
    await destroyAssetQuietly(media.thumbnailPath, "image");
  }

  return { id: media.id, fileName: media.fileName, detached: attachments };
};

export const MediaService = {
  uploadFiles,
  getMediaList,
  getMediaById,
  updateMedia,
  deleteMedia,
};
