import { Router } from "express";

import { requirePermission } from "../../middlewares/requirePermission";
import { validateRequest } from "../../middlewares/validateRequest";
import { CategoryController } from "./category.controller";
import { CategoryValidation } from "./category.validation";

const router = Router();

router.get(
  "/tree",
  requirePermission("category:read"),
  validateRequest({ query: CategoryValidation.treeQuerySchema }),
  CategoryController.getCategoryTree,
);

router
  .route("/")
  .get(
    requirePermission("category:read"),
    validateRequest({ query: CategoryValidation.listQuerySchema }),
    CategoryController.getCategories,
  )
  .post(
    requirePermission("category:create"),
    validateRequest({ body: CategoryValidation.createCategorySchema }),
    CategoryController.createCategory,
  );

router
  .route("/:id")
  .get(
    requirePermission("category:read"),
    validateRequest({ params: CategoryValidation.idParamSchema }),
    CategoryController.getCategoryById,
  )
  .patch(
    requirePermission("category:update"),
    validateRequest({
      params: CategoryValidation.idParamSchema,
      body: CategoryValidation.updateCategorySchema,
    }),
    CategoryController.updateCategory,
  )
  .delete(
    requirePermission("category:delete"),
    validateRequest({ params: CategoryValidation.idParamSchema }),
    CategoryController.deleteCategory,
  );

export const CategoryRoutes = router;
