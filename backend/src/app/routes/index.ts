import { Router } from "express";

import { AuthRoutes } from "../modules/auth/auth.route";
import { MediaRoutes } from "../modules/media/media.route";
import { PermissionRoutes } from "../modules/permission/permission.route";
import { RoleRoutes } from "../modules/role/role.route";
import { UserRoutes } from "../modules/user/user.route";

export const router = Router();

interface ModuleRoute {
  path: string;
  route: Router;
}

const moduleRoutes: ModuleRoute[] = [
  { path: "/auth", route: AuthRoutes },
  { path: "/permissions", route: PermissionRoutes },
  { path: "/roles", route: RoleRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/media", route: MediaRoutes },
];

moduleRoutes.forEach((moduleRoute) => {
  router.use(moduleRoute.path, moduleRoute.route);
});
