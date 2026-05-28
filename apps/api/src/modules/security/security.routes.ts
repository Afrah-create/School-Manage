import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRoles } from "../../middleware/rbac.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as c from "./security.controller.js";

const adminOnly = requireRoles("admin");

export const securityRouter = Router();

securityRouter.use(requireAuth, adminOnly);

securityRouter.post("/block-ip", asyncHandler(c.blockIp));
securityRouter.get("/audit-log", asyncHandler(c.auditLog));
securityRouter.get("/metrics/api-usage", asyncHandler(c.apiUsage));
