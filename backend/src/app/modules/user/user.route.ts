import { Router } from "express";

import { requirePermission } from "../../middlewares/requirePermission";
import { validateRequest } from "../../middlewares/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router
  .route("/")
  .get(
    requirePermission("user:read"),
    validateRequest({ query: UserValidation.listQuerySchema }),
    UserController.getUsers,
  )
  .post(
    requirePermission("user:create"),
    validateRequest({ body: UserValidation.createUserSchema }),
    UserController.createUser,
  );

router.patch(
  "/:id/status",
  requirePermission("user:update"),
  validateRequest({
    params: UserValidation.idParamSchema,
    body: UserValidation.updateStatusSchema,
  }),
  UserController.updateStatus,
);

router
  .route("/:id")
  .get(
    requirePermission("user:read"),
    validateRequest({ params: UserValidation.idParamSchema }),
    UserController.getUserById,
  )
  .patch(
    requirePermission("user:update"),
    validateRequest({
      params: UserValidation.idParamSchema,
      body: UserValidation.updateUserSchema,
    }),
    UserController.updateUser,
  )
  .delete(
    requirePermission("user:delete"),
    validateRequest({ params: UserValidation.idParamSchema }),
    UserController.deleteUser,
  );

export const UserRoutes = router;
