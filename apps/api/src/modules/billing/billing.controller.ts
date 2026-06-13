import type { Request, Response } from "express";
import { billingCheckoutSchema } from "@uganda-cbc-sms/shared";
import { HttpError } from "../../utils/httpError.js";
import * as svc from "./billing.service.js";

function requireTenantUser(req: Request): { tenantId: string; userId: string } {
  if (!req.user?.tenantId) throw new HttpError(401, "Sign in required.");
  return {
    tenantId: req.user.tenantId,
    userId: req.user.id,
  };
}

export async function status(req: Request, res: Response): Promise<void> {
  const tenantId = req.user?.tenantId ?? req.tenant?.id;
  if (!tenantId) {
    res.status(400).json({ success: false, error: "School context required." });
    return;
  }
  const data = await svc.getTenantBillingStatus(tenantId);
  res.json({ success: true, data });
}

export async function periods(req: Request, res: Response): Promise<void> {
  const { tenantId } = requireTenantUser(req);
  const data = await svc.listTenantBillingPeriods(tenantId);
  res.json({ success: true, data });
}

export async function payments(req: Request, res: Response): Promise<void> {
  const { tenantId } = requireTenantUser(req);
  const data = await svc.listPaymentHistory(tenantId);
  res.json({ success: true, data });
}

export async function checkout(req: Request, res: Response): Promise<void> {
  const { tenantId, userId } = requireTenantUser(req);
  if (!["admin", "headteacher"].includes(req.user!.role)) {
    throw new HttpError(403, "Only administrators can pay the school subscription.");
  }
  const body = billingCheckoutSchema.parse(req.body);
  const data = await svc.startCheckout(tenantId, userId, body.billingPeriodId);
  res.json({ success: true, data, message: "Checkout started." });
}

export async function mockComplete(req: Request, res: Response): Promise<void> {
  const { tenantId } = requireTenantUser(req);
  const paymentId = req.params.paymentId;
  if (!paymentId) throw new HttpError(400, "Payment id required.");
  await svc.completeMockPayment(paymentId, tenantId);
  const billing = await svc.getTenantBillingStatus(tenantId);
  res.json({ success: true, data: { billing }, message: "Mock payment completed." });
}

export async function verifyReturn(req: Request, res: Response): Promise<void> {
  const { tenantId } = requireTenantUser(req);
  const txRef = typeof req.query.tx_ref === "string" ? req.query.tx_ref : "";
  if (!txRef) throw new HttpError(400, "Missing tx_ref.");
  const billing = await svc.verifyCheckoutReturn(txRef, tenantId);
  res.json({ success: true, data: { billing } });
}
