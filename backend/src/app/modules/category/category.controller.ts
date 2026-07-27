import { StatusCodes } from "http-status-codes";

import { getQuery } from "../../middlewares/validateRequest";
import { catchAsync } from "../../utils/catchAsync";
import { getParam } from "../../utils/params";
import { sendResponse } from "../../utils/sendResponse";
import type { ICategoryListQuery, ICategoryTreeQuery } from "./category.interface";
import { CategoryService } from "./category.service";

const createCategory = catchAsync(async (req, res) => {
  const data = await CategoryService.createCategory(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Category created successfully.",
    data,
  });
});

const getCategories = catchAsync(async (req, res) => {
  const result = await CategoryService.getCategories(getQuery<ICategoryListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Categories retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getCategoryTree = catchAsync(async (req, res) => {
  const data = await CategoryService.getCategoryTree(getQuery<ICategoryTreeQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category tree retrieved successfully.",
    data,
  });
});

const getCategoryById = catchAsync(async (req, res) => {
  const data = await CategoryService.getCategoryById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category retrieved successfully.",
    data,
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const data = await CategoryService.updateCategory(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category updated successfully.",
    data,
  });
});

const deleteCategory = catchAsync(async (req, res) => {
  const data = await CategoryService.deleteCategory(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category deleted successfully.",
    data,
  });
});

export const CategoryController = {
  createCategory,
  getCategories,
  getCategoryTree,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
