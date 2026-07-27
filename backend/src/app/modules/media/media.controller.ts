import type { Request } from "express";
import { StatusCodes } from "http-status-codes";

import { UPLOAD_FIELD_MANY, UPLOAD_FIELD_ONE } from "../../config/multer";
import { getQuery } from "../../middlewares/validateRequest";
import { getActor } from "../../utils/actor";
import { catchAsync } from "../../utils/catchAsync";
import { getParam } from "../../utils/params";
import { sendResponse } from "../../utils/sendResponse";
import type { IMediaListQuery, IUploadedFile } from "./media.interface";
import { MediaService } from "./media.service";

const collectFiles = (req: Request): IUploadedFile[] => {
  const grouped = req.files as Record<string, Express.Multer.File[]> | undefined;
  if (!grouped) return [];

  return [...(grouped[UPLOAD_FIELD_MANY] ?? []), ...(grouped[UPLOAD_FIELD_ONE] ?? [])].map(
    (file) => ({
      originalname: file.originalname,
      buffer: file.buffer,
      size: file.size,
    }),
  );
};

const uploadMedia = catchAsync(async (req, res) => {
  const actor = getActor(req);
  const data = await MediaService.uploadFiles(collectFiles(req), actor.id);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: `${data.length} file(s) uploaded successfully.`,
    data,
  });
});

const getMediaList = catchAsync(async (req, res) => {
  const result = await MediaService.getMediaList(getQuery<IMediaListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Media retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getMediaById = catchAsync(async (req, res) => {
  const data = await MediaService.getMediaById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Media retrieved successfully.",
    data,
  });
});

const updateMedia = catchAsync(async (req, res) => {
  const data = await MediaService.updateMedia(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Media updated successfully.",
    data,
  });
});

const deleteMedia = catchAsync(async (req, res) => {
  const { force } = getQuery<{ force?: string }>(req);
  const data = await MediaService.deleteMedia(getParam(req, "id"), force === "true");

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Media deleted successfully.",
    data,
  });
});

export const MediaController = {
  uploadMedia,
  getMediaList,
  getMediaById,
  updateMedia,
  deleteMedia,
};
