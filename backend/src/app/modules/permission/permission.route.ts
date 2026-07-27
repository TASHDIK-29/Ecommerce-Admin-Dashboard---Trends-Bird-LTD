import { Router } from "express";

import {
  requireAnyPermission,
  requirePermission,
} from "../../middlewares/requirePermission";
import { validateRequest } from "../../middlewares/validateRequest";
import { PermissionController } from "./permission.controller";
import { PermissionValidation } from "./permission.validation";

const router = Router();

router.get(
  "/actions",
  requireAnyPermission("permission:read", "role:read", "role:update"),
  PermissionController.getStandardActions,
);

router
  .route("/groups")
  .get(
    requireAnyPermission("permission:read", "role:read", "role:update"),
    validateRequest({ query: PermissionValidation.listQuerySchema }),
    PermissionController.getGroups,
  )
  .post(
    requirePermission("permission:create"),
    validateRequest({ body: PermissionValidation.createGroupSchema }),
    PermissionController.createGroup,
  );

router
  .route("/groups/:id")
  .get(
    requirePermission("permission:read"),
    validateRequest({ params: PermissionValidation.idParamSchema }),
    PermissionController.getGroupById,
  )
  .patch(
    requirePermission("permission:update"),
    validateRequest({
      params: PermissionValidation.idParamSchema,
      body: PermissionValidation.updateGroupSchema,
    }),
    PermissionController.updateGroup,
  )
  .delete(
    requirePermission("permission:delete"),
    validateRequest({ params: PermissionValidation.idParamSchema }),
    PermissionController.deleteGroup,
  );

router
  .route("/")
  .get(
    requireAnyPermission("permission:read", "role:read", "role:update"),
    validateRequest({ query: PermissionValidation.listQuerySchema }),
    PermissionController.getPermissions,
  )
  .post(
    requirePermission("permission:create"),
    validateRequest({ body: PermissionValidation.createPermissionSchema }),
    PermissionController.createPermission,
  );

router
  .route("/:id")
  .get(
    requirePermission("permission:read"),
    validateRequest({ params: PermissionValidation.idParamSchema }),
    PermissionController.getPermissionById,
  )
  .patch(
    requirePermission("permission:update"),
    validateRequest({
      params: PermissionValidation.idParamSchema,
      body: PermissionValidation.updatePermissionSchema,
    }),
    PermissionController.updatePermission,
  )
  .delete(
    requirePermission("permission:delete"),
    validateRequest({ params: PermissionValidation.idParamSchema }),
    PermissionController.deletePermission,
  );

export const PermissionRoutes = router;
