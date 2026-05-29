import type { NextFunction, Request, Response } from "express";
import type { TenantFeatureFlagKey } from "@uganda-cbc-sms/shared";
import { loadTenantFeatureFlags, isFeatureEnabled } from "../config/featureFlags.js";
import { requireRequestTenantId } from "../utils/requestTenant.js";

export function requireFeature(flag: TenantFeatureFlagKey) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = requireRequestTenantId(req);
      const flags = await loadTenantFeatureFlags(tenantId);
      if (!isFeatureEnabled(flags, flag)) {
        res.status(403).json({
          success: false,
          error: "This module is not enabled for your school. Contact platform support.",
          code: "FEATURE_DISABLED",
        });
        return;
      }
      req.tenantFeatureFlags = flags;
      next();
    } catch (e) {
      next(e);
    }
  };
}
