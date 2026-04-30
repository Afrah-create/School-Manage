/** JWT payload decode (no verification) — safe for Edge middleware and browser. */

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function jwtCookieMaxAge(token: string, defaultMaxAgeSec = 8 * 60 * 60): number {
  const p = decodeJwtPayload(token);
  if (!p) return defaultMaxAgeSec;
  const exp = typeof p.exp === "number" ? p.exp : null;
  if (!exp) return defaultMaxAgeSec;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(60, exp - now);
}
