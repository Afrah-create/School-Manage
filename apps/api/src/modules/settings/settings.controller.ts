import { updateSchoolSettingsSchema } from "@uganda-cbc-sms/shared";
import type { Request, Response } from "express";
import { HttpError } from "../../utils/httpError";
import * as svc from "./settings.service";

export async function getSchoolSettings(_req: Request, res: Response): Promise<void> {
  const data = await svc.getSchoolSettings();
  res.json({ success: true, data, message: "School settings loaded." });
}

export async function putSchoolSettings(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new HttpError(401, "Please sign in to continue.");
  }
  const body = updateSchoolSettingsSchema.parse(req.body);
  const data = await svc.updateSchoolSettings(body, req.user.id);
  res.json({ success: true, data, message: "School settings updated." });
}
