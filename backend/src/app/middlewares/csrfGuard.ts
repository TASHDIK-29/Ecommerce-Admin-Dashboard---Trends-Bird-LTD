import crypto from "node:crypto";

import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../error/AppError";
import { CSRF_TOKEN_COOKIE } from "../utils/cookies";

export const CSRF_HEADER = "x-csrf-token";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_EXEMPT_ROUTES = new Set(["POST /auth/login"]);

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const usesBearerAuth = (req: { headers: { authorization?: string } }): boolean => {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") && header.length > 7;
};

export const csrfGuard: RequestHandler = (req, _res, next) => {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  if (usesBearerAuth(req)) {
    next();
    return;
  }

  const path = req.path.replace(/\/+$/, "") || "/";
  if (CSRF_EXEMPT_ROUTES.has(`${req.method.toUpperCase()} ${path}`)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_TOKEN_COOKIE];
  if (typeof cookieToken !== "string" || cookieToken.length === 0) {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER];
  const provided = Array.isArray(headerToken) ? headerToken[0] : headerToken;

  if (typeof provided !== "string" || !safeEqual(cookieToken, provided)) {
    next(
      new AppError(
        StatusCodes.FORBIDDEN,
        `CSRF validation failed. Send the "${CSRF_TOKEN_COOKIE}" cookie value in the "${CSRF_HEADER}" header.`,
        [{ path: CSRF_HEADER, message: "Missing or mismatched CSRF token." }],
      ),
    );
    return;
  }

  next();
};
