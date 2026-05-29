import { updateSchoolSettingsSchema } from "@uganda-cbc-sms/shared";
import type { Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import { activeTenantId } from "../../utils/activeTenant.js";
import * as svc from "./settings.service";

export async function getSchoolSettings(req: Request, res: Response): Promise<void> {
  const data = await svc.getSchoolSettings(activeTenantId(req));
  res.json({ success: true, data, message: "School settings loaded." });
}

export async function putSchoolSettings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new HttpError(401, "Please sign in to continue.");
  }
  const body = updateSchoolSettingsSchema.parse(req.body);
  const data = await svc.updateSchoolSettings(body, req.user.id, activeTenantId(req));
  res.json({ success: true, data, message: "School settings updated." });
}

export async function uploadSchoolLogo(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new HttpError(401, "Please sign in to continue.");
  }
  if (!req.file) {
    throw new HttpError(400, "No logo file was uploaded.");
  }
  const logoUrl = `/uploads/${req.tenant!.id}/settings/${req.file.filename}`;
  const data = await svc.setSchoolLogo(logoUrl, req.user.id, activeTenantId(req));
  res.json({ success: true, data, message: "School logo uploaded." });
}
