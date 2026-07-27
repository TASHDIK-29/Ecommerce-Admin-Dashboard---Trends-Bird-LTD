import { Router } from "express";

import { AttributeRoutes } from "../modules/attribute/attribute.route";
import { AuthRoutes } from "../modules/auth/auth.route";
import { BrandRoutes } from "../modules/brand/brand.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { MediaRoutes } from "../modules/media/media.route";
import { PermissionRoutes } from "../modules/permission/permission.route";
import { ProductRoutes } from "../modules/product/product.route";
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
  { path: "/categories", route: CategoryRoutes },
  { path: "/brands", route: BrandRoutes },
  { path: "/attributes", route: AttributeRoutes },
  { path: "/products", route: ProductRoutes },
];

moduleRoutes.forEach((moduleRoute) => {
  router.use(moduleRoute.path, moduleRoute.route);
});
