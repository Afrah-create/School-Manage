import type { Request } from "express";
import { tenantContext } from "../config/db.js";
import { getDefaultTenantId } from "../config/tenant.js";
import { HttpError } from "./httpError.js";
import { requireRequestTenantId } from "./requestTenant.js";

/** Tenant for the current HTTP request (subdomain + JWT). */
export function activeTenantId(req: Request): string {
  return requireRequestTenantId(req);
}

/** Tenant from AsyncLocalStorage (set by bindTenantContext). */
export function activeTenantIdFromContext(): string {
  const tid = tenantContext.getStore();
  if (!tid) {
    throw new HttpError(400, "School context is required for this operation.");
  }
  return tid;
}

/** Resolve tenant for middleware/bootstrap only (bare localhost). */
export async function defaultTenantId(): Promise<string> {
  return getDefaultTenantId();
}
