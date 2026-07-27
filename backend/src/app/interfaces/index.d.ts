import type { AuthUser } from "./auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;

      validatedQuery?: unknown;
    }
  }
}

export {};
