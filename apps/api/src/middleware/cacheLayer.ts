import type { NextFunction, Request, Response } from "express";
import NodeCache from "node-cache";
import type { Role } from "@uganda-cbc-sms/shared";

const tierA = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
const tierB = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const TIER_A_PREFIXES = [
  "/api/academic/years",
  "/api/academic/terms",
  "/api/academic/classes",
  "/api/academic/subjects",
  "/api/fees/structure",
];

const TIER_B_PREFIXES = ["/api/analytics/dashboard", "/api/analytics/", "/api/reports/summary"];

const TIER_B_ROLES = new Set<Role>(["admin", "headteacher"]);

function cacheKey(req: Request): string {
  const role = req.user?.role ?? "anon";
  const tenant = req.tenant?.id ?? req.user?.tenantId ?? "no-tenant";
  const q = JSON.stringify(req.query ?? {});
  return `${req.method}:${req.path}:${q}:${role}:${tenant}`;
}

function pickCache(path: string, role?: Role): NodeCache | null {
  if (TIER_A_PREFIXES.some((p) => path.startsWith(p))) return tierA;
  if (TIER_B_PREFIXES.some((p) => path.startsWith(p)) && role && TIER_B_ROLES.has(role)) {
    return tierB;
  }
  return null;
}

function shouldNeverCache(req: Request): boolean {
  if (req.method !== "GET") return true;
  if (req.path.startsWith("/api/auth")) return true;
  if (/^\/api\/students\/[^/]+$/.test(req.path)) return true;
  if (req.path.startsWith("/api/fees/payments")) return true;
  return false;
}

export function cacheLayerMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (shouldNeverCache(req)) {
    return next();
  }

  const store = pickCache(req.path, req.user?.role);
  if (!store) return next();

  const key = cacheKey(req);
  const hit = store.get<string>(key);
  if (hit) {
    res.setHeader("X-Cache", "HIT");
    const ttl = store.getTtl(key);
    if (ttl) {
      const age = Math.max(0, Math.floor((ttl - Date.now()) / 1000));
      res.setHeader("X-Cache-Age", String(age));
    }
    res.setHeader("Content-Type", "application/json");
    res.send(hit);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        store.set(key, JSON.stringify(body));
      } catch {
        /* ignore */
      }
    }
    res.setHeader("X-Cache", "MISS");
    return originalJson(body);
  };
  next();
}

export function invalidateCachePrefix(prefix: string): void {
  for (const store of [tierA, tierB]) {
    for (const k of store.keys()) {
      if (k.includes(prefix)) store.del(k);
    }
  }
}
