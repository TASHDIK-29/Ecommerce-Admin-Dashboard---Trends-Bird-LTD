import { Router } from "express";

import { requirePermission } from "../../middlewares/requirePermission";
import { validateRequest } from "../../middlewares/validateRequest";
import { RoleController } from "./role.controller";
import { RoleValidation } from "./role.validation";

const router = Router();

router
  .route("/")
  .get(
    requirePermission("role:read"),
    validateRequest({ query: RoleValidation.listQuerySchema }),
    RoleController.getRoles,
  )
  .post(
    requirePermission("role:create"),
    validateRequest({ body: RoleValidation.createRoleSchema }),
    RoleController.createRole,
  );

router.post(
  "/:id/permissions/grant-all",
  requirePermission("role:update"),
  validateRequest({ params: RoleValidation.idParamSchema }),
  RoleController.grantAllPermissions,
);

router
  .route("/:id/permissions")
  .post(
    requirePermission("role:update"),
    validateRequest({
      params: RoleValidation.idParamSchema,
      body: RoleValidation.modifyPermissionsSchema,
    }),
    RoleController.addPermissions,
  )
  .delete(
    requirePermission("role:update"),
    validateRequest({
      params: RoleValidation.idParamSchema,
      body: RoleValidation.modifyPermissionsSchema,
    }),
    RoleController.removePermissions,
  );

router
  .route("/:id")
  .get(
    requirePermission("role:read"),
    validateRequest({ params: RoleValidation.idParamSchema }),
    RoleController.getRoleById,
  )
  .patch(
    requirePermission("role:update"),
    validateRequest({
      params: RoleValidation.idParamSchema,
      body: RoleValidation.updateRoleSchema,
    }),
    RoleController.updateRole,
  )
  .delete(
    requirePermission("role:delete"),
    validateRequest({ params: RoleValidation.idParamSchema }),
    RoleController.deleteRole,
  );

export const RoleRoutes = router;
