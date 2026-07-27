import type { CookieOptions, Response } from "express";

import { envVars, isProduction } from "../config/env";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";
export const CSRF_TOKEN_COOKIE = "csrfToken";

export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export const durationToMs = (duration: string): number => {
  const match = /^(\d+)\s*([smhd])?$/i.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${duration}". Use a number of seconds or a value like 15m, 24h, 7d.`,
    );
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
};

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
});

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string; csrfToken: string },
): void => {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    path: "/",
    maxAge: durationToMs(envVars.JWT.ACCESS_EXPIRES),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: durationToMs(envVars.JWT.REFRESH_EXPIRES),
  });

  res.cookie(CSRF_TOKEN_COOKIE, tokens.csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
    path: "/",
    maxAge: durationToMs(envVars.JWT.REFRESH_EXPIRES),
  });
};

export const clearAuthCookies = (res: Response): void => {
  const options = baseCookieOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...options, path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...options, path: REFRESH_COOKIE_PATH });
  res.clearCookie(CSRF_TOKEN_COOKIE, { ...options, httpOnly: false, path: "/" });
};
