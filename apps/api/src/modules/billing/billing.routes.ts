import { Router } from "express";
import { requireAuth } from "../../middleware/jwtGuard.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as ctrl from "./billing.controller.js";

export const billingRouter = Router();

billingRouter.get("/status", asyncHandler(ctrl.status));
billingRouter.use(requireAuth);
billingRouter.get("/periods", asyncHandler(ctrl.periods));
billingRouter.get("/payments", asyncHandler(ctrl.payments));
billingRouter.post("/checkout", asyncHandler(ctrl.checkout));
billingRouter.post("/mock-complete/:paymentId", asyncHandler(ctrl.mockComplete));
billingRouter.get("/verify-return", asyncHandler(ctrl.verifyReturn));

export { requireActiveSubscription } from "./billing.middleware.js";
