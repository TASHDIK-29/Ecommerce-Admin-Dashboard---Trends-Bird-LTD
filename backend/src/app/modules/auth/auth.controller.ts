import type { Request } from "express";
import { StatusCodes } from "http-status-codes";

import { AppError } from "../../error/AppError";
import { getActor } from "../../utils/actor";
import { catchAsync } from "../../utils/catchAsync";
import {
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from "../../utils/cookies";
import { sendResponse } from "../../utils/sendResponse";
import type { TokenContext } from "../../utils/tokens";
import { AuthService } from "./auth.service";

const readContext = (req: Request): TokenContext => ({
  userAgent: req.headers["user-agent"]?.slice(0, 255),
  ipAddress: req.ip,
});

const readRefreshToken = (req: Request): string | undefined => {
  const fromCookie = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (typeof fromCookie === "string" && fromCookie.length > 0) return fromCookie;

  const fromBody = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  if (typeof fromBody === "string" && fromBody.length > 0) return fromBody;

  return undefined;
};

const login = catchAsync(async (req, res) => {
  const result = await AuthService.login(req.body, readContext(req));

  setAuthCookies(res, result.tokens);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Logged in successfully.",
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
      csrfToken: result.tokens.csrfToken,
    },
  });
});

const refresh = catchAsync(async (req, res) => {
  const refreshToken = readRefreshToken(req);

  if (!refreshToken) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "No refresh token was provided.",
    );
  }

  const result = await AuthService.refreshSession(refreshToken, readContext(req));

  setAuthCookies(res, result.tokens);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Session refreshed successfully.",
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
      csrfToken: result.tokens.csrfToken,
    },
  });
});

const logout = catchAsync(async (req, res) => {
  await AuthService.logout(readRefreshToken(req));

  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Logged out successfully.",
    data: null,
  });
});

const getSession = catchAsync(async (req, res) => {
  const actor = getActor(req);
  const user = await AuthService.getSession(actor.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Session retrieved successfully.",
    data: user,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const actor = getActor(req);
  await AuthService.changePassword(actor.id, req.body);

  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password changed successfully. Please sign in again.",
    data: null,
  });
});

export const AuthController = {
  login,
  refresh,
  logout,
  getSession,
  changePassword,
};
