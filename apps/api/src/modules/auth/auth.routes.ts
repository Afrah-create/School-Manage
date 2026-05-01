import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import * as c from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(c.login));
authRouter.post("/logout", requireAuth, asyncHandler(c.logout));
authRouter.patch("/change-password", requireAuth, asyncHandler(c.changePassword));
authRouter.post("/password-reset/request-code", asyncHandler(c.requestPasswordResetCode));
authRouter.post("/password-reset/verify-code", asyncHandler(c.verifyPasswordResetCode));
authRouter.post("/password-reset/confirm", asyncHandler(c.resetPasswordWithCode));
authRouter.post("/email-verification/request-code", asyncHandler(c.requestEmailVerificationCode));
authRouter.post("/email-verification/verify-code", asyncHandler(c.verifyEmailCode));
