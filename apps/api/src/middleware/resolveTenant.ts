import type { NextFunction, Request, Response } from "express";
import { getDefaultTenantId, lookupTenantBySubdomain } from "../config/tenant.js";
import { loadEnv } from "../config/env.js";
import { getCachedTenantBySlug } from "../utils/tenantCache.js";

const RESERVED_SUBDOMAINS = new Set(["platform", "www", "api", "admin"]);

function extractSubdomain(host: string, rootDomain: string): string | null {
  const h = host.split(":")[0]!.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") {
    return null;
  }
  if (h.endsWith(".localhost")) {
    const label = h.slice(0, -".localhost".length);
    const parts = label.split(".");
    return parts[parts.length - 1] ?? null;
  }
  // Shared hosting (Vercel/Render): tenant comes from X-Tenant-Slug, not the deployment hostname.
  if (h.endsWith(".vercel.app") || h.endsWith(".onrender.com")) {
    return null;
  }
  if (rootDomain && h.endsWith(`.${rootDomain}`)) {
    const prefix = h.slice(0, -(rootDomain.length + 1));
    const parts = prefix.split(".").filter(Boolean);
    if (parts.length === 1) {
      return parts[0] ?? null;
    }
    if (parts.length > 1) {
      return parts[parts.length - 1] ?? null;
    }
    return null;
  }
  return null;
}

function isPlatformPath(path: string): boolean {
  return path.startsWith("/api/platform");
}

export async function resolveTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (isPlatformPath(req.path) || req.path === "/api/health") {
    next();
    return;
  }

  const headerSlug = req.headers["x-tenant-slug"];
  const slugFromHeader =
    typeof headerSlug === "string" && headerSlug.trim() ? headerSlug.trim().toLowerCase() : null;

  const env = loadEnv();
  const host =
    (typeof req.headers["x-forwarded-host"] === "string"
      ? req.headers["x-forwarded-host"]
      : req.headers.host) ?? req.hostname;

  let slug = slugFromHeader ?? extractSubdomain(host, env.APP_ROOT_DOMAIN);

  if (!slug || RESERVED_SUBDOMAINS.has(slug)) {
    if (slugFromHeader) {
      res.status(404).json({
        success: false,
        error: "School not found for this address.",
        code: "TENANT_NOT_FOUND",
      });
      return;
    }
    try {
      const defaultId = await getDefaultTenantId();
      const tenant = await lookupTenantBySubdomain("default");
      if (tenant) {
        req.tenant = {
          id: tenant.id,
          slug: tenant.slug,
          displayName: tenant.display_name,
          status: tenant.status,
        };
        next();
        return;
      }
      req.tenant = {
        id: defaultId,
        slug: "default",
        displayName: "Default School",
        status: "active",
      };
      next();
      return;
    } catch {
      res.status(503).json({
        success: false,
        error: "No school tenant is configured. Run migrations and seed.",
        code: "TENANT_NOT_CONFIGURED",
      });
      return;
    }
  }

  const tenant = await getCachedTenantBySlug(slug);
  if (!tenant) {
    res.status(404).json({
      success: false,
      error: "School not found for this address.",
      code: "TENANT_NOT_FOUND",
    });
    return;
  }

  if (tenant.status === "suspended") {
    res.status(403).json({
      success: false,
      error: "This school account is suspended. Contact platform support.",
      code: "TENANT_SUSPENDED",
    });
    return;
  }

  req.tenant = {
    id: tenant.id,
    slug: tenant.slug,
    displayName: tenant.display_name,
    status: tenant.status,
  };
  next();
}
