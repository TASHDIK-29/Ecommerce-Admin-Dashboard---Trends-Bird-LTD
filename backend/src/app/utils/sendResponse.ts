import type { Response } from "express";

export interface TMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

export interface TResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  meta?: TMeta;
}

/**
 * The one success shape for the whole API. `meta` is present on list
 * endpoints and omitted everywhere else, so the frontend can rely on it.
 */
export const sendResponse = <T>(res: Response, payload: TResponse<T>): void => {
  const body: Record<string, unknown> = {
    statusCode: payload.statusCode,
    success: payload.success,
    message: payload.message,
  };

  if (payload.meta) {
    body.meta = payload.meta;
  }

  body.data = payload.data;

  res.status(payload.statusCode).json(body);
};
