/**
 * Vercel serverless entry point.
 *
 * `src/server.ts` owns the long-lived process used by `npm run dev` and
 * `npm start`: it connects, calls `listen`, and installs signal handlers.
 * None of that applies on Vercel, where each request is handed to a function
 * that must export a handler instead of binding a port. An Express
 * application is already a `(req, res)` handler, so it is exported directly.
 *
 * `vercel.json` rewrites every path here, and the rewrite preserves the
 * original request URL, so the app's own routing still sees `/api/v1/...`
 * and `/health` exactly as it does locally.
 */
import app from "../src/app";

export default app;
