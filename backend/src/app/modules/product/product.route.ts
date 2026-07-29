import { Router } from "express";

import { requirePermission } from "../../middlewares/requirePermission";
import { validateRequest } from "../../middlewares/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();

router
  .route("/")
  .get(
    requirePermission("product:read"),
    validateRequest({ query: ProductValidation.listQuerySchema }),
    ProductController.getProducts,
  )
  .post(
    requirePermission("product:create"),
    validateRequest({ body: ProductValidation.createProductSchema }),
    ProductController.createProduct,
  );

// Declared before "/:id" so a slug is never mistaken for an id. The dashboard reads
// a product through this route, which keeps the surrogate id out of the browser URL.
router.get(
  "/slug/:slug",
  requirePermission("product:read"),
  validateRequest({ params: ProductValidation.slugParamSchema }),
  ProductController.getProductBySlug,
);

router.post(
  "/:id/variants/generate",
  requirePermission("product:update"),
  validateRequest({
    params: ProductValidation.idParamSchema,
    body: ProductValidation.generateVariantsSchema,
  }),
  ProductController.generateVariants,
);

router.post(
  "/:id/variants",
  requirePermission("product:update"),
  validateRequest({
    params: ProductValidation.idParamSchema,
    body: ProductValidation.createVariantSchema,
  }),
  ProductController.addVariant,
);

router
  .route("/:id/variants/:variantId")
  .patch(
    requirePermission("product:update"),
    validateRequest({
      params: ProductValidation.variantParamSchema,
      body: ProductValidation.updateVariantSchema,
    }),
    ProductController.updateVariant,
  )
  .delete(
    requirePermission("product:delete"),
    validateRequest({ params: ProductValidation.variantParamSchema }),
    ProductController.deleteVariant,
  );

router.patch(
  "/:id/media/reorder",
  requirePermission("product:update"),
  validateRequest({
    params: ProductValidation.idParamSchema,
    body: ProductValidation.reorderMediaSchema,
  }),
  ProductController.reorderMedia,
);

router.post(
  "/:id/media",
  requirePermission("product:update"),
  validateRequest({
    params: ProductValidation.idParamSchema,
    body: ProductValidation.attachMediaSchema,
  }),
  ProductController.attachMedia,
);

router
  .route("/:id/media/:attachmentId")
  .patch(
    requirePermission("product:update"),
    validateRequest({
      params: ProductValidation.attachmentParamSchema,
      body: ProductValidation.updateAttachmentSchema,
    }),
    ProductController.updateAttachment,
  )
  .delete(
    requirePermission("product:delete"),
    validateRequest({ params: ProductValidation.attachmentParamSchema }),
    ProductController.detachMedia,
  );

router
  .route("/:id")
  .get(
    requirePermission("product:read"),
    validateRequest({ params: ProductValidation.idParamSchema }),
    ProductController.getProductById,
  )
  .patch(
    requirePermission("product:update"),
    validateRequest({
      params: ProductValidation.idParamSchema,
      body: ProductValidation.updateProductSchema,
    }),
    ProductController.updateProduct,
  )
  .delete(
    requirePermission("product:delete"),
    validateRequest({ params: ProductValidation.idParamSchema }),
    ProductController.deleteProduct,
  );

export const ProductRoutes = router;
