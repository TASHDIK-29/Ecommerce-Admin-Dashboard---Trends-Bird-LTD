import { StatusCodes } from "http-status-codes";

import { getQuery } from "../../middlewares/validateRequest";
import { catchAsync } from "../../utils/catchAsync";
import { getParam } from "../../utils/params";
import { sendResponse } from "../../utils/sendResponse";
import type { IRoleListQuery } from "./role.interface";
import { RoleService } from "./role.service";

const createRole = catchAsync(async (req, res) => {
  const data = await RoleService.createRole(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Role created successfully.",
    data,
  });
});

const getRoles = catchAsync(async (req, res) => {
  const result = await RoleService.getRoles(getQuery<IRoleListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Roles retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getRoleById = catchAsync(async (req, res) => {
  const data = await RoleService.getRoleById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Role retrieved successfully.",
    data,
  });
});

const updateRole = catchAsync(async (req, res) => {
  const data = await RoleService.updateRole(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Role updated successfully.",
    data,
  });
});

const addPermissions = catchAsync(async (req, res) => {
  const data = await RoleService.addPermissions(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permissions granted successfully.",
    data,
  });
});

const removePermissions = catchAsync(async (req, res) => {
  const data = await RoleService.removePermissions(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Permissions revoked successfully.",
    data,
  });
});

const grantAllPermissions = catchAsync(async (req, res) => {
  const data = await RoleService.grantAllPermissions(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All permissions granted successfully.",
    data,
  });
});

const deleteRole = catchAsync(async (req, res) => {
  const data = await RoleService.deleteRole(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Role deleted successfully.",
    data,
  });
});

export const RoleController = {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  addPermissions,
  removePermissions,
  grantAllPermissions,
  deleteRole,
};
