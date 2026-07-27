import type { Request, RequestHandler } from "express";
import type { ZodType } from "zod";

export interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export const validateRequest =
  (schemas: RequestSchemas): RequestHandler =>
  async (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body ?? {});
      }

      if (schemas.params) {
        Object.assign(req.params, await schemas.params.parseAsync(req.params));
      }

      if (schemas.query) {
        const parsed = await schemas.query.parseAsync(req.query);
        Object.defineProperty(req, "validatedQuery", {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export const getQuery = <T = Record<string, unknown>>(req: Request): T =>
  (req.validatedQuery ?? req.query) as T;
