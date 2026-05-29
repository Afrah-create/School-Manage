import { Router } from "express";
import { requirePlatformAuth } from "../../middleware/platformAuth.js";
import * as ctrl from "./platform.controller.js";

export const platformRouter = Router();

platformRouter.post("/auth/login", ctrl.login);

platformRouter.use(requirePlatformAuth);
platformRouter.get("/tenants", ctrl.listTenants);
platformRouter.get("/audit-log", ctrl.listAuditLog);
platformRouter.post("/tenants", ctrl.createTenant);
platformRouter.patch("/tenants/:id", ctrl.patchTenant);
platformRouter.post("/tenants/:id/reset-admin-password", ctrl.resetAdminPassword);
