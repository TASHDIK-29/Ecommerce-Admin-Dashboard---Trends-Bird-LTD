import { Router } from "express";

import { requirePermission } from "../../middlewares/requirePermission";
import { validateRequest } from "../../middlewares/validateRequest";
import { BrandController } from "./brand.controller";
import { BrandValidation } from "./brand.validation";

const router = Router();

router
  .route("/")
  .get(
    requirePermission("brand:read"),
    validateRequest({ query: BrandValidation.listQuerySchema }),
    BrandController.getBrands,
  )
  .post(
    requirePermission("brand:create"),
    validateRequest({ body: BrandValidation.createBrandSchema }),
    BrandController.createBrand,
  );

router
  .route("/:id")
  .get(
    requirePermission("brand:read"),
    validateRequest({ params: BrandValidation.idParamSchema }),
    BrandController.getBrandById,
  )
  .patch(
    requirePermission("brand:update"),
    validateRequest({
      params: BrandValidation.idParamSchema,
      body: BrandValidation.updateBrandSchema,
    }),
    BrandController.updateBrand,
  )
  .delete(
    requirePermission("brand:delete"),
    validateRequest({ params: BrandValidation.idParamSchema }),
    BrandController.deleteBrand,
  );

export const BrandRoutes = router;
