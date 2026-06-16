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
  const parts = host.split(".");
  if (parts.length >= 3) {
    const slug = parts[0]!;
    if (slug === "platform" || slug === "www" || slug === "api") {
      return slug === "platform" ? "platform" : null;
    }
    return slug;
  }
  return null;
}

export function isPlatformHost(hostname: string): boolean {
  return tenantSlugFromHost(hostname) === "platform";
}

/** Tenant slug for API calls (Host header is not sent to the API origin in the browser). */
export function getApiTenantSlug(token?: string | null): string {
  if (typeof window !== "undefined") {
    const fromHost = getTenantSlugFromHostname(window.location.hostname);
    if (fromHost && fromHost !== "platform") return fromHost;
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
