import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

/**
 * Registered after all routes and BEFORE the global error handler, so an
 * unmatched path returns a clean 404 in the standard error shape rather than
 * Express's default HTML page.
 */
export const notFound: RequestHandler = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    statusCode: StatusCodes.NOT_FOUND,
    success: false,
    message: `Route ${req.method} ${req.originalUrl} does not exist.`,
    errorSources: [{ path: req.originalUrl, message: "Route not found." }],
    stack: null,
  });
};
