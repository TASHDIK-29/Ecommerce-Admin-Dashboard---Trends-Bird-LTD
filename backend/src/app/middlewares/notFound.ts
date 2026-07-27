import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

export const notFound: RequestHandler = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    statusCode: StatusCodes.NOT_FOUND,
    success: false,
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
    errorSources: [{ path: req.originalUrl, message: "Route not found." }],
    stack: null,
  });
};
