import type { Request, RequestHandler } from "express";
import type { ZodType } from "zod";

/**
 * Validates the parts of a request a handler is allowed to read.
 *
 * Section 7 of the assignment requires that every body, query parameter and
 * route parameter is validated before it reaches business logic, so each part
 * gets its own schema and the parsed (coerced, stripped) result replaces the
 * raw input.
 */
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
        // Express 5 exposes `req.query` as a getter-only property, so the
        // parsed result is stashed for handlers to read instead of assigned.
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

/**
 * Reads the validated query set above, falling back to the raw query for
 * routes that declare no query schema.
 */
export const getQuery = <T = Record<string, unknown>>(req: Request): T =>
  (req.validatedQuery ?? req.query) as T;
