import { Router } from "express";

import { uploadHandler } from "../../config/multer";
import { requirePermission } from "../../middlewares/requirePermission";
import { validateRequest } from "../../middlewares/validateRequest";
import { MediaController } from "./media.controller";
import { MediaValidation } from "./media.validation";

const router = Router();

router.post(
  "/upload",
  requirePermission("media:upload"),
  uploadHandler,
  MediaController.uploadMedia,
);

router.get(
  "/",
  requirePermission("media:read"),
  validateRequest({ query: MediaValidation.listQuerySchema }),
  MediaController.getMediaList,
);

router
  .route("/:id")
  .get(
    requirePermission("media:read"),
    validateRequest({ params: MediaValidation.idParamSchema }),
    MediaController.getMediaById,
  )
  .patch(
    requirePermission("media:write"),
    validateRequest({
      params: MediaValidation.idParamSchema,
      body: MediaValidation.updateMediaSchema,
    }),
    MediaController.updateMedia,
  )
  .delete(
    requirePermission("media:delete"),
    validateRequest({
      params: MediaValidation.idParamSchema,
      query: MediaValidation.deleteQuerySchema,
    }),
    MediaController.deleteMedia,
  );

export const MediaRoutes = router;
