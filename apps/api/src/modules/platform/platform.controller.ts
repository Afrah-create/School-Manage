import type { Request, Response } from "express";
import {
  createTenantSchema,
  platformLoginSchema,
  updateTenantSchema,
} from "@uganda-cbc-sms/shared";
import { HttpError } from "../../utils/httpError.js";
import * as authSvc from "./platformAuth.service.js";
import * as svc from "./platform.service.js";

export async function login(req: Request, res: Response): Promise<void> {
  const body = platformLoginSchema.parse(req.body);
  const data = await authSvc.platformLogin(body);
  res.json({ success: true, data, message: "Platform sign-in successful." });
}

export async function listTenants(_req: Request, res: Response): Promise<void> {
  const data = await svc.listTenants();
  res.json({ success: true, data });
}

export async function createTenant(req: Request, res: Response): Promise<void> {
  if (!req.platformAdmin) throw new HttpError(401, "Platform sign-in required.");
  const body = createTenantSchema.parse(req.body);
  const data = await svc.createTenant(body, req.platformAdmin.id);
  res.status(201).json({
    success: true,
    data,
    message: `School "${data.displayName}" created. Sign in at https://${data.slug}.localhost:3000`,
  });
}

export async function patchTenant(req: Request, res: Response): Promise<void> {
  if (!req.platformAdmin) throw new HttpError(401, "Platform sign-in required.");
  const id = req.params["id"];
  if (!id) throw new HttpError(400, "Tenant id is required.");
  const body = updateTenantSchema.parse(req.body);
  const data = await svc.updateTenant(id, body, req.platformAdmin.id);
  res.json({ success: true, data, message: "Tenant updated." });
}

export async function listAuditLog(_req: Request, res: Response): Promise<void> {
  const data = await svc.listPlatformAuditLog(100);
  res.json({ success: true, data });
}

export async function resetAdminPassword(req: Request, res: Response): Promise<void> {
  if (!req.platformAdmin) throw new HttpError(401, "Platform sign-in required.");
  const id = req.params["id"];
  if (!id) throw new HttpError(400, "Tenant id is required.");
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters.");
  }
  await svc.resetTenantAdminPassword(id, password, req.platformAdmin.id);
  res.json({ success: true, data: null, message: "School admin password reset." });
}
