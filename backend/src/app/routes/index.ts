import { Router } from "express";

import { AuthRoutes } from "../modules/auth/auth.route";
import { PermissionRoutes } from "../modules/permission/permission.route";
import { RoleRoutes } from "../modules/role/role.route";

export const router = Router();

interface ModuleRoute {
  path: string;
  route: Router;
}

const moduleRoutes: ModuleRoute[] = [
  { path: "/auth", route: AuthRoutes },
  { path: "/permissions", route: PermissionRoutes },
  { path: "/roles", route: RoleRoutes },
];

moduleRoutes.forEach((moduleRoute) => {
  router.use(moduleRoute.path, moduleRoute.route);
});
