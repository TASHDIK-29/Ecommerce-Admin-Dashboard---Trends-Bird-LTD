import { StatusCodes } from "http-status-codes";

import { getQuery } from "../../middlewares/validateRequest";
import { getActor } from "../../utils/actor";
import { catchAsync } from "../../utils/catchAsync";
import { getParam } from "../../utils/params";
import { sendResponse } from "../../utils/sendResponse";
import type { IUserListQuery } from "./user.interface";
import { UserService } from "./user.service";

const createUser = catchAsync(async (req, res) => {
  const data = await UserService.createUser(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "User created successfully.",
    data,
  });
});

const getUsers = catchAsync(async (req, res) => {
  const result = await UserService.getUsers(getQuery<IUserListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Users retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const data = await UserService.getUserById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User retrieved successfully.",
    data,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const data = await UserService.updateUser(getParam(req, "id"), req.body, getActor(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User updated successfully.",
    data,
  });
});

const updateStatus = catchAsync(async (req, res) => {
  const data = await UserService.updateStatus(getParam(req, "id"), req.body, getActor(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: data.isActive ? "User activated successfully." : "User deactivated successfully.",
    data,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const data = await UserService.deleteUser(getParam(req, "id"), getActor(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User deleted successfully.",
    data,
  });
});

export const UserController = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateStatus,
  deleteUser,
};
