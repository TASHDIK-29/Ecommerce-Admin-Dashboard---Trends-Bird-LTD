import { Router } from "express";
import rateLimit from "express-rate-limit";

import { validateRequest } from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();


const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: "Too many login attempts. Please try again in a few minutes.",
    errorSources: [{ path: "email", message: "Rate limit exceeded." }],
    stack: null,
  },
});


router.post(
  "/login",
  loginRateLimit,
  validateRequest({ body: AuthValidation.loginSchema }),
  AuthController.login,
);

router.post(
  "/refresh",
  validateRequest({ body: AuthValidation.refreshSchema }),
  AuthController.refresh,
);

router.post("/logout", AuthController.logout);


router.get("/session", AuthController.getSession);

router.post(
  "/change-password",
  validateRequest({ body: AuthValidation.changePasswordSchema }),
  AuthController.changePassword,
);

export const AuthRoutes = router;
