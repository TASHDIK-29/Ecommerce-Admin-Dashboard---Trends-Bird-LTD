import { Router } from "express";

import { AuthRoutes } from "../modules/auth/auth.route";

export const router = Router();

/**
 * Every feature module is mounted here and nowhere else.
 *
 * Because the auth guard is applied to the whole `/api/v1` mount in app.ts,
 * adding a module to this array means it is protected by default — a new
 * route cannot be forgotten and left open.
 */
interface ModuleRoute {
  path: string;
  route: Router;
}

const moduleRoutes: ModuleRoute[] = [{ path: "/auth", route: AuthRoutes }];

moduleRoutes.forEach((moduleRoute) => {
  router.use(moduleRoute.path, moduleRoute.route);
});
