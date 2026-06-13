import { Router } from "express";
import { requirePlatformAuth } from "../../middleware/platformAuth.js";
import * as ctrl from "./platform.controller.js";
import * as billingCtrl from "./platformBilling.controller.js";

export const platformRouter = Router();

platformRouter.post("/auth/login", ctrl.login);
platformRouter.post("/billing/webhooks/flutterwave", billingCtrl.flutterwaveWebhook);

platformRouter.use(requirePlatformAuth);
platformRouter.get("/tenants", ctrl.listTenants);
platformRouter.get("/audit-log", ctrl.listAuditLog);
platformRouter.post("/tenants", ctrl.createTenant);
platformRouter.patch("/tenants/:id", ctrl.patchTenant);
platformRouter.post("/tenants/:id/suspend", ctrl.suspendTenant);
platformRouter.post("/tenants/:id/activate", ctrl.activateTenant);
platformRouter.post("/tenants/:id/reset-admin-password", ctrl.resetAdminPassword);
platformRouter.get("/billing/overview", billingCtrl.billingOverview);
platformRouter.get("/billing/settings", billingCtrl.billingSettings);
platformRouter.patch("/billing/settings", billingCtrl.patchBillingSettings);
platformRouter.post("/billing/periods", billingCtrl.createPeriod);
platformRouter.patch("/billing/periods/:id", billingCtrl.patchPeriod);
platformRouter.post("/billing/run-overdue", billingCtrl.runOverdue);
