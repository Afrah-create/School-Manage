import type { NextFunction, Request, Response } from "express";
import { getTenantBillingStatus } from "./billing.service.js";

const PAYMENT_ROLES = new Set(["admin", "headteacher"]);

function isBillingAllowlisted(path: string, method: string): boolean {
  const p = path.replace(/^\/api/, "") || "/";
  if (p === "/health" || p.startsWith("/health/")) return true;
  if (p.startsWith("/auth/login") && method === "POST") return true;
  if (p.startsWith("/auth/logout")) return true;
  if (p.startsWith("/auth/change-password")) return true;
  if (p.startsWith("/auth/password-reset")) return true;
  if (p.startsWith("/billing")) return true;
  if (p.startsWith("/onboarding")) return true;
  if (p === "/users/me" && method === "GET") return true;
  return false;
}

export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user?.tenantId || isBillingAllowlisted(req.path, req.method)) {
    next();
    return;
  }

  try {
    const billing = await getTenantBillingStatus(req.user.tenantId);
    if (billing.canUseApp) {
      next();
      return;
    }

    if (PAYMENT_ROLES.has(req.user.role)) {
      res.status(402).json({
        success: false,
        error: billing.message ?? "School subscription payment is required.",
        code: "SUBSCRIPTION_REQUIRED",
        data: { billing },
      });
      return;
    }

    res.status(403).json({
      success: false,
      error:
        "Your school's subscription is unpaid. Contact your school administrator to restore access.",
      code: "SUBSCRIPTION_BLOCKED",
      data: { billing: { accessStatus: billing.accessStatus, message: billing.message } },
    });
  } catch (e) {
    next(e);
  }
}
