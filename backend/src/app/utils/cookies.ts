import type { CookieOptions, Response } from "express";

import { envVars, isProduction } from "../config/env";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";
export const CSRF_TOKEN_COOKIE = "csrfToken";

/**
 * The refresh token is only ever sent to the auth routes, so scoping its path
 * keeps it off every other request.
 */
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

/**
 * Turns "15m" / "7d" / "3600" into milliseconds, for cookie `maxAge`.
 * Kept in step with the JWT `expiresIn` strings so the cookie and the token
 * expire together instead of leaving a dead cookie behind.
 */
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

/**
 * `sameSite` must track `secure`.
 *
 * In production the dashboard and the API sit on different domains, so the
 * cookie has to be SameSite=None — which browsers only accept when Secure is
 * also set. In development over plain http, a non-secure SameSite=None cookie
 * is silently dropped, so we fall back to Lax.
 */
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

  // Readable by JavaScript on purpose: the frontend must echo it back in the
  // X-CSRF-Token header. That is the whole point of the double-submit pattern
  // — an attacker's site can send the cookie but cannot read it to build the
  // matching header.
  res.cookie(CSRF_TOKEN_COOKIE, tokens.csrfToken, {
    ...baseCookieOptions(),
    httpOnly: false,
    path: "/",
    maxAge: durationToMs(envVars.JWT.REFRESH_EXPIRES),
  });
};

/**
 * Clearing must mirror how the cookie was set — same path, same sameSite,
 * same secure — or the browser keeps the original cookie and "logout" only
 * appears to work.
 */
export const clearAuthCookies = (res: Response): void => {
  const options = baseCookieOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...options, path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...options, path: REFRESH_COOKIE_PATH });
  res.clearCookie(CSRF_TOKEN_COOKIE, { ...options, httpOnly: false, path: "/" });
};
