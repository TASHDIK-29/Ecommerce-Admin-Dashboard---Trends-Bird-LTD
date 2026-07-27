import { StatusCodes } from "http-status-codes";

import { getQuery } from "../../middlewares/validateRequest";
import { getParam } from "../../utils/params";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { STANDARD_ACTIONS } from "./permission.constant";
import type { IListQuery } from "./permission.interface";
import { PermissionService } from "./permission.service";

const getStandardActions = catchAsync(async (_req, res) => {
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Standard actions retrieved successfully.",
    data: STANDARD_ACTIONS,
  });
});

const createGroup = catchAsync(async (req, res) => {
  const data = await PermissionService.createGroup(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Permission group created successfully.",
    data,
  });
});

const getGroups = catchAsync(async (req, res) => {
  const result = await PermissionService.getGroups(getQuery<IListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permission groups retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getGroupById = catchAsync(async (req, res) => {
  const data = await PermissionService.getGroupById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permission group retrieved successfully.",
    data,
  });
});

const updateGroup = catchAsync(async (req, res) => {
  const data = await PermissionService.updateGroup(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permission group updated successfully.",
    data,
  });
});

const deleteGroup = catchAsync(async (req, res) => {
  const data = await PermissionService.deleteGroup(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permission group deleted successfully.",
    data,
  });
});

const getPermissions = catchAsync(async (req, res) => {
  const result = await PermissionService.getPermissions(getQuery<IListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permissions retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getPermissionById = catchAsync(async (req, res) => {
  const data = await PermissionService.getPermissionById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permission retrieved successfully.",
    data,
  });
});

const createPermission = catchAsync(async (req, res) => {
  const data = await PermissionService.createPermission(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Permission created successfully.",
    data,
  });
});

const updatePermission = catchAsync(async (req, res) => {
  const data = await PermissionService.updatePermission(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permission updated successfully.",
    data,
  });
});

const deletePermission = catchAsync(async (req, res) => {
  const data = await PermissionService.deletePermission(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permission deleted successfully.",
    data,
  });
});

export const PermissionController = {
  getStandardActions,
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  getPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
};
