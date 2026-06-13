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
  res.json({
    success: true,
    data: {
      defaultAmountUgx: data.defaultAmountUgx,
      currency: data.currency,
      graceDays: data.graceDays,
    },
  });
}

export async function patchBillingSettings(req: Request, res: Response): Promise<void> {
  if (!req.platformAdmin) throw new HttpError(401, "Platform sign-in required.");
  const body = platformBillingSettingsSchema.parse(req.body);
  const data = await svc.updateBillingSettings(
    {
      defaultAmountUgx: body.defaultAmountUgx,
      currency: body.currency,
      graceDays: body.graceDays,
    },
    req.platformAdmin.id,
  );
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
  if (!id) throw new HttpError(400, "Period id required.");
  const body = updateBillingPeriodSchema.parse(req.body);
  await svc.updateBillingPeriod(id, body, req.platformAdmin.id);
  res.json({ success: true, message: "Billing period updated." });
}

export async function runOverdue(_req: Request, res: Response): Promise<void> {
  const updated = await svc.markOverdueBillingPeriods();
  res.json({ success: true, data: { updated }, message: "Overdue periods processed." });
}

export async function flutterwaveWebhook(req: Request, res: Response): Promise<void> {
  await svc.handleFlutterwaveWebhook(req.headers, req.body);
  res.status(200).json({ success: true });
}
