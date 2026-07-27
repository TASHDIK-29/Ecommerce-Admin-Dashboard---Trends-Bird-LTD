import { StatusCodes } from "http-status-codes";

import { getQuery } from "../../middlewares/validateRequest";
import { catchAsync } from "../../utils/catchAsync";
import { getParam } from "../../utils/params";
import { sendResponse } from "../../utils/sendResponse";
import type { IBrandListQuery } from "./brand.interface";
import { BrandService } from "./brand.service";

const createBrand = catchAsync(async (req, res) => {
  const data = await BrandService.createBrand(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Brand created successfully.",
    data,
  });
});

const getBrands = catchAsync(async (req, res) => {
  const result = await BrandService.getBrands(getQuery<IBrandListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Brands retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getBrandById = catchAsync(async (req, res) => {
  const data = await BrandService.getBrandById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Brand retrieved successfully.",
    data,
  });
});

const updateBrand = catchAsync(async (req, res) => {
  const data = await BrandService.updateBrand(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Brand updated successfully.",
    data,
  });
});

const deleteBrand = catchAsync(async (req, res) => {
  const data = await BrandService.deleteBrand(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Brand deleted successfully.",
    data,
  });
});

export const BrandController = {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
};
