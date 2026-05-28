import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { authRateLimiter } from "../../middleware/rateLimiter";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", authRateLimiter, asyncHandler(c.login));
authRouter.post("/password-reset/request-code", authRateLimiter, asyncHandler(c.requestPasswordResetCode));
authRouter.post("/password-reset/verify-code", authRateLimiter, asyncHandler(c.verifyPasswordResetCode));
authRouter.post("/password-reset/confirm", authRateLimiter, asyncHandler(c.resetPasswordWithCode));
authRouter.post("/logout", requireAuth, asyncHandler(c.logout));
authRouter.patch("/change-password", requireAuth, asyncHandler(c.changePassword));
authRouter.post("/email-verification/request-code", asyncHandler(c.requestEmailVerificationCode));
authRouter.post("/email-verification/verify-code", asyncHandler(c.verifyEmailCode));
