import { getSmsTokenFromCookie } from "@/lib/cookies";
import { decodeJwtPayload } from "@/lib/jwtPayload";
import { usesSubdomainTenancy } from "@/lib/tenantRouting";

/** Subdomain slug for the current school tenant, or null on bare localhost. */
export function getTenantSlugFromHostname(hostname: string): string | null {
  return tenantSlugFromHost(hostname);
}

/** Host-only slug resolver (middleware-safe, no `window`). */
export function tenantSlugFromHost(hostname: string): string | null {
  const host = hostname.split(":")[0]!.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") {
    return null;
  }
  if (host.endsWith(".localhost")) {
    const label = host.slice(0, -".localhost".length);
    const parts = label.split(".");
    const slug = parts[parts.length - 1] ?? null;
    if (!slug || slug === "platform" || slug === "www" || slug === "api") {
      return slug === "platform" ? "platform" : null;
    }
    return slug;
  }
  // Production demo: Vercel/Render apex URLs are not tenant subdomains.
  // Tenant is sent via X-Tenant-Slug (JWT or "default") on a shared web origin.
  if (host.endsWith(".vercel.app") || host.endsWith(".onrender.com")) {
    return null;
  }
  return null;
}

export function isPlatformHost(hostname: string): boolean {
  return tenantSlugFromHost(hostname) === "platform";
}

const LOGIN_TENANT_SLUG_KEY = "sms_login_tenant_slug";

/** Optional school slug for shared-host login (Vercel demo). */
export function getLoginTenantSlugOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = sessionStorage.getItem(LOGIN_TENANT_SLUG_KEY)?.trim().toLowerCase();
    if (fromStorage) return fromStorage;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = (params.get("school") ?? params.get("tenant"))?.trim().toLowerCase();
    if (fromQuery) {
      sessionStorage.setItem(LOGIN_TENANT_SLUG_KEY, fromQuery);
      return fromQuery;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setLoginTenantSlugOverride(slug: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (slug?.trim()) {
      sessionStorage.setItem(LOGIN_TENANT_SLUG_KEY, slug.trim().toLowerCase());
    } else {
      sessionStorage.removeItem(LOGIN_TENANT_SLUG_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Tenant slug for API calls (Host header is not sent to the API origin in the browser). */
export function getApiTenantSlug(token?: string | null): string {
  if (typeof window !== "undefined" && usesSubdomainTenancy(window.location.hostname)) {
    const fromHost = getTenantSlugFromHostname(window.location.hostname);
    if (fromHost && fromHost !== "platform") return fromHost;
  }
  if (typeof window !== "undefined" && !usesSubdomainTenancy(window.location.hostname)) {
    const loginSlug = getLoginTenantSlugOverride();
    if (loginSlug) return loginSlug;
  }
  const raw = token ?? getSmsTokenFromCookie();
  if (raw) {
    const payload = decodeJwtPayload(raw);
    const tsl = payload?.tsl;
    if (typeof tsl === "string" && tsl.trim()) return tsl.trim().toLowerCase();
  }
  return "default";
}

/** Dev: build origin for a school subdomain (*.localhost). Production uses the request host. */
export function schoolOriginForSlug(
  slug: string,
  request: { protocol: string; port?: string; hostname?: string },
): string {
  const hostname = request.hostname?.split(":")[0]?.toLowerCase() ?? "localhost";
  if (!usesSubdomainTenancy(hostname)) {
    const rawPort = request.port?.replace(/^:/, "") ?? "";
    const portSuffix = rawPort ? `:${rawPort}` : "";
    return `${request.protocol}//${hostname}${portSuffix}`;
  }
  const rawPort = request.port?.replace(/^:/, "") ?? "";
  const portSuffix = rawPort ? `:${rawPort}` : "";
  return `${request.protocol}//${slug.toLowerCase()}.localhost${portSuffix}`;
}

export function isForcePasswordChangePath(pathname: string): boolean {
  return pathname === "/auth/change-password" || pathname.startsWith("/auth/change-password/");
}

export function passwordSetupPath(role: string, forcePasswordChange: boolean): string | null {
  if (!forcePasswordChange) return null;
  return role === "admin" ? "/admin/onboarding" : "/auth/change-password";
}

export function isPasswordSetupPath(pathname: string, role: string): boolean {
  if (isForcePasswordChangePath(pathname)) return true;
  if (role === "admin" && pathname.startsWith("/admin/onboarding")) return true;
  return false;
}

export function isPublicSchoolAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/") || pathname.startsWith("/auth/");
}

export function schoolLoginUrl(slug: string): string {
  if (typeof window !== "undefined") {
    if (!usesSubdomainTenancy(window.location.hostname)) {
      return `${window.location.origin}/login`;
    }
    const port = window.location.port ? `:${window.location.port}` : "";
    return `${window.location.protocol}//${slug}.localhost${port}/login`;
  }
  return `http://${slug}.localhost:3000/login`;
}
