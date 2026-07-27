import { Router } from "express";

import { AuthRoutes } from "../modules/auth/auth.route";
import { PermissionRoutes } from "../modules/permission/permission.route";

export const router = Router();

interface ModuleRoute {
  path: string;
  route: Router;
}

const moduleRoutes: ModuleRoute[] = [
  { path: "/auth", route: AuthRoutes },
  { path: "/permissions", route: PermissionRoutes },
];

moduleRoutes.forEach((moduleRoute) => {
  router.use(moduleRoute.path, moduleRoute.route);
});
