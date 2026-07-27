import type { AuthUser } from "./auth.types";

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by `authGuard` on every authenticated request.
       *
       * Optional at the type level because public routes (login, refresh,
       * logout) run without it. Handlers behind the guard can safely assert it
       * via the `getActor(req)` helper in utils/actor.ts, which throws a 401
       * rather than letting `undefined` leak into business logic.
       */
      user?: AuthUser;

      /**
       * The parsed result of a route's query schema.
       *
       * Express 5 makes `req.query` a getter-only property, so `validateRequest`
       * cannot overwrite it in place. Read this through `getQuery(req)` rather
       * than touching it directly.
       */
      validatedQuery?: unknown;
    }
  }
}

export {};
