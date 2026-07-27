import { Router } from "express";

import { requirePermission } from "../../middlewares/requirePermission";
import { validateRequest } from "../../middlewares/validateRequest";
import { AttributeController } from "./attribute.controller";
import { AttributeValidation } from "./attribute.validation";

const router = Router();

router
  .route("/")
  .get(
    requirePermission("attribute:read"),
    validateRequest({ query: AttributeValidation.listQuerySchema }),
    AttributeController.getAttributes,
  )
  .post(
    requirePermission("attribute:create"),
    validateRequest({ body: AttributeValidation.createAttributeSchema }),
    AttributeController.createAttribute,
  );

router.post(
  "/:id/values",
  requirePermission("attribute:update"),
  validateRequest({
    params: AttributeValidation.idParamSchema,
    body: AttributeValidation.addValuesSchema,
  }),
  AttributeController.addValues,
);

router
  .route("/:id/values/:valueId")
  .patch(
    requirePermission("attribute:update"),
    validateRequest({
      params: AttributeValidation.valueParamSchema,
      body: AttributeValidation.updateValueSchema,
    }),
    AttributeController.updateValue,
  )
  .delete(
    requirePermission("attribute:delete"),
    validateRequest({ params: AttributeValidation.valueParamSchema }),
    AttributeController.deleteValue,
  );

router
  .route("/:id")
  .get(
    requirePermission("attribute:read"),
    validateRequest({ params: AttributeValidation.idParamSchema }),
    AttributeController.getAttributeById,
  )
  .patch(
    requirePermission("attribute:update"),
    validateRequest({
      params: AttributeValidation.idParamSchema,
      body: AttributeValidation.updateAttributeSchema,
    }),
    AttributeController.updateAttribute,
  )
  .delete(
    requirePermission("attribute:delete"),
    validateRequest({ params: AttributeValidation.idParamSchema }),
    AttributeController.deleteAttribute,
  );

export const AttributeRoutes = router;
