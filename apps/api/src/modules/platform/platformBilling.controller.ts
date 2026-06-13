import type { Request, Response } from "express";
import {
  createBillingPeriodSchema,
  platformBillingSettingsSchema,
  updateBillingPeriodSchema,
} from "@uganda-cbc-sms/shared";
import { HttpError } from "../../utils/httpError.js";
import * as svc from "../billing/billing.service.js";

export async function billingOverview(_req: Request, res: Response): Promise<void> {
  const data = await svc.listPlatformBillingOverview();
  res.json({ success: true, data });
}

export async function billingSettings(_req: Request, res: Response): Promise<void> {
  const data = await svc.getBillingSettings();
  res.json({ success: true, data });
}

export async function patchBillingSettings(req: Request, res: Response): Promise<void> {
  if (!req.platformAdmin) throw new HttpError(401, "Platform sign-in required.");
  const body = platformBillingSettingsSchema.parse(req.body);
  const data = await svc.updateBillingSettings(body, req.platformAdmin.id);
  res.json({ success: true, data, message: "Billing settings updated." });
}

export async function createPeriod(req: Request, res: Response): Promise<void> {
  if (!req.platformAdmin) throw new HttpError(401, "Platform sign-in required.");
  const body = createBillingPeriodSchema.parse(req.body);
  const data = await svc.createBillingPeriod(body, req.platformAdmin.id);
  res.status(201).json({ success: true, data, message: "Billing period created." });
}

export async function patchPeriod(req: Request, res: Response): Promise<void> {
  if (!req.platformAdmin) throw new HttpError(401, "Platform sign-in required.");
  const id = req.params["id"];
  if (!id) throw new HttpError(400, "Period id is required.");
  const body = updateBillingPeriodSchema.parse(req.body);
  await svc.updateBillingPeriod(id, body, req.platformAdmin.id);
  res.json({ success: true, data: null, message: "Billing period updated." });
}

export async function runOverdue(_req: Request, res: Response): Promise<void> {
  const updated = await svc.markOverdueBillingPeriods();
  res.json({
    success: true,
    data: { updated },
    message: `Marked ${updated} period(s) overdue.`,
  });
}

export async function flutterwaveWebhook(req: Request, res: Response): Promise<void> {
  await svc.handleFlutterwaveWebhook(req.headers, req.body);
  res.json({ success: true, data: null });
}
