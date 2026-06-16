/** True when tenants are addressed via `{slug}.localhost` (local dev only). */
export function usesSubdomainTenancy(hostname: string): boolean {
  const host = hostname.split(":")[0]!.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

/** Origin for a school tenant app. Production uses the current host (X-Tenant-Slug on API). */
export function schoolAppOrigin(slug: string): string {
  if (typeof window === "undefined") {
    return `http://${slug}.localhost:3000`;
  }
  if (!usesSubdomainTenancy(window.location.hostname)) {
    return window.location.origin;
  }
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${slug}.localhost${port}`;
}

export function redirectToSchoolTenant(slug: string, path: string): void {
  if (typeof window === "undefined") return;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  window.location.href = `${schoolAppOrigin(slug)}${normalized}`;
}
