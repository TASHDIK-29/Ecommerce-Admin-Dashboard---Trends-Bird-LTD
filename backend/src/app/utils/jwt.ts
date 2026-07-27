import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import type { JwtPayloadData } from "../interfaces/auth.types";

/**
 * Thin wrappers around jsonwebtoken so callers never repeat the algorithm or
 * the payload shape. Verification errors are intentionally NOT caught here —
 * the auth guard distinguishes expired from malformed and maps both to 401.
 */
export const generateToken = (
  payload: JwtPayloadData,
  secret: string,
  expiresIn: string,
): string =>
  jwt.sign(payload, secret, {
    expiresIn,
    algorithm: "HS256",
  } as SignOptions);

export const verifyToken = (token: string, secret: string): JwtPayloadData & JwtPayload =>
  jwt.verify(token, secret, { algorithms: ["HS256"] }) as JwtPayloadData & JwtPayload;
