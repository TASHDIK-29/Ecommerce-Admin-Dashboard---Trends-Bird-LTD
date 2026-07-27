import { StatusCodes } from "http-status-codes";

import { getQuery } from "../../middlewares/validateRequest";
import { catchAsync } from "../../utils/catchAsync";
import { getParam } from "../../utils/params";
import { sendResponse } from "../../utils/sendResponse";
import type { IAttributeListQuery } from "./attribute.interface";
import { AttributeService } from "./attribute.service";

const createAttribute = catchAsync(async (req, res) => {
  const data = await AttributeService.createAttribute(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Attribute created successfully.",
    data,
  });
});

const getAttributes = catchAsync(async (req, res) => {
  const result = await AttributeService.getAttributes(getQuery<IAttributeListQuery>(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Attributes retrieved successfully.",
    meta: result.meta,
    data: result.data,
  });
});

const getAttributeById = catchAsync(async (req, res) => {
  const data = await AttributeService.getAttributeById(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Attribute retrieved successfully.",
    data,
  });
});

const updateAttribute = catchAsync(async (req, res) => {
  const data = await AttributeService.updateAttribute(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Attribute updated successfully.",
    data,
  });
});

const deleteAttribute = catchAsync(async (req, res) => {
  const data = await AttributeService.deleteAttribute(getParam(req, "id"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Attribute deleted successfully.",
    data,
  });
});

const addValues = catchAsync(async (req, res) => {
  const data = await AttributeService.addValues(getParam(req, "id"), req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Attribute values added successfully.",
    data,
  });
});

const updateValue = catchAsync(async (req, res) => {
  const data = await AttributeService.updateValue(
    getParam(req, "id"),
    getParam(req, "valueId"),
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Attribute value updated successfully.",
    data,
  });
});

const deleteValue = catchAsync(async (req, res) => {
  const data = await AttributeService.deleteValue(getParam(req, "id"), getParam(req, "valueId"));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Attribute value deleted successfully.",
    data,
  });
});

export const AttributeController = {
  createAttribute,
  getAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  addValues,
  updateValue,
  deleteValue,
};
