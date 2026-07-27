import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";

import { envVars } from "./app/config/env";
import { authGuard } from "./app/middlewares/authGuard";
import { csrfGuard } from "./app/middlewares/csrfGuard";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";
import { notFound } from "./app/middlewares/notFound";
import { router } from "./app/routes";

const app: Application = express();

// Required for `secure` cookies to be set correctly behind a proxy (Vercel,
// Render, nginx). Without it Express sees plain http and refuses to send them.
app.set("trust proxy", 1);

app.use(helmet());

// Credentials mode forbids a wildcard origin, so the frontend URL must be
// listed exactly — this is the cost of the HttpOnly-cookie token strategy.
app.use(
  cors({
    origin: envVars.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/**
 * Authentication is applied to the WHOLE API tree, not route by route.
 *
 * Section 4.2 requires that a new route is protected without anyone
 * remembering to protect it. Mounting the guard here inverts the default:
 * everything is closed, and opening a route means adding it to the explicit
 * allowlist in authGuard.ts. Forgetting to guard a route is no longer possible
 * — the failure mode is a route that is too strict, which is visible
 * immediately, rather than one that is wide open, which is not.
 *
 * csrfGuard runs first so a forged request is rejected before it costs a
 * database round trip.
 */
app.use("/api/v1", csrfGuard, authGuard, router);

app.get("/", (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    statusCode: StatusCodes.OK,
    success: true,
    message: "Trends Bird Ecommerce Admin API is running.",
    data: { version: "1.0.0", docs: "/api/v1" },
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    statusCode: StatusCodes.OK,
    success: true,
    message: "Healthy",
    data: { uptime: process.uptime(), timestamp: new Date().toISOString() },
  });
});

// Order matters: an unmatched route must be turned into a 404 BEFORE the
// four-argument error handler, which only runs on the error path.
app.use(notFound);
app.use(globalErrorHandler);

export default app;
