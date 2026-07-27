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

app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: envVars.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

app.use(notFound);
app.use(globalErrorHandler);

export default app;
