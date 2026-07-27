import { StatusCodes } from "http-status-codes";

import { getQuery } from "../../middlewares/validateRequest";
import { catchAsync } from "../../utils/catchAsync";
import { getParam } from "../../utils/params";
import { sendResponse } from "../../utils/sendResponse";
import type { IProductListQuery } from "./product.interface";
import { ProductService } from "./product.service";

const createProduct = catchAsync(async (req, res) => {
  const data = await ProductService.createProduct(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Product created successfully.",
    data,
  });
});

const getProducts = catchAsync(async (req, res) => {
  const result = await ProductService.getProducts(getQuery<IProductListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Products retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getProductById = catchAsync(async (req, res) => {
  const data = await ProductService.getProductById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product retrieved successfully.",
    data,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const data = await ProductService.updateProduct(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product updated successfully.",
    data,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  const data = await ProductService.deleteProduct(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product deleted successfully.",
    data,
  });
});

const addVariant = catchAsync(async (req, res) => {
  const data = await ProductService.addVariant(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Variant added successfully.",
    data,
  });
});

const updateVariant = catchAsync(async (req, res) => {
  const data = await ProductService.updateVariant(
    getParam(req, "id"),
    getParam(req, "variantId"),
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Variant updated successfully.",
    data,
  });
});

const deleteVariant = catchAsync(async (req, res) => {
  const data = await ProductService.deleteVariant(getParam(req, "id"), getParam(req, "variantId"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Variant deleted successfully.",
    data,
  });
});

const generateVariants = catchAsync(async (req, res) => {
  const data = await ProductService.generateVariants(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: `${data.created} variant(s) generated, ${data.skipped} skipped.`,
    data,
  });
});

const attachMedia = catchAsync(async (req, res) => {
  const data = await ProductService.attachMedia(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Media attached successfully.",
    data,
  });
});

const updateAttachment = catchAsync(async (req, res) => {
  const data = await ProductService.updateAttachment(
    getParam(req, "id"),
    getParam(req, "attachmentId"),
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Media attachment updated successfully.",
    data,
  });
});

const reorderMedia = catchAsync(async (req, res) => {
  const data = await ProductService.reorderMedia(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Gallery reordered successfully.",
    data,
  });
});

const detachMedia = catchAsync(async (req, res) => {
  const data = await ProductService.detachMedia(getParam(req, "id"), getParam(req, "attachmentId"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Media detached successfully. The library asset was kept.",
    data,
  });
});

export const ProductController = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  generateVariants,
  attachMedia,
  updateAttachment,
  reorderMedia,
  detachMedia,
};
