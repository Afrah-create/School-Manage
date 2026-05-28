import type { NextFunction, Request, Response } from "express";
import { loadEnv } from "../config/env.js";
import { getRedis, redisExpire, redisIncr } from "../config/redis.js";
import { blockIpAddress } from "./ipBlocklist.js";
import { writeSecurityAuditLog } from "../modules/security/securityAudit.service.js";

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

function memIncr(key: string, windowSec: number): number {
  const now = Date.now();
  const row = memoryCounters.get(key);
  if (!row || row.resetAt <= now) {
    memoryCounters.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return 1;
  }
  row.count += 1;
  return row.count;
}

async function track(key: string, windowSec: number): Promise<number> {
  const redis = getRedis();
  if (redis) {
    try {
      const n = await redisIncr(key);
      if (n === 1) await redisExpire(key, windowSec);
      return n;
    } catch {
      /* fallback */
    }
  }
  return memIncr(key, windowSec);
}

async function autoBlock(ip: string, reason: string, hours: number): Promise<void> {
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await blockIpAddress({ ip, reason, expiresAt });
  writeSecurityAuditLog({
    eventType: "ip_auto_blocked",
    ipAddress: ip,
    severity: "high",
    details: { reason, expiresAt: expiresAt.toISOString() },
  });
}

export function anomalyDetectorMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? "unknown";
  const path = req.path ?? "";
  const method = req.method;

  void (async () => {
    const env = loadEnv();

    if (method === "GET" && /^\/api\/students\/[^/]+$/.test(req.originalUrl)) {
      const n = await track(`anom:enum:${ip}`, 60);
      if (n > 30) {
        writeSecurityAuditLog({
          eventType: "enumeration_attempt",
          ipAddress: ip,
          userId: req.user?.id ?? null,
          severity: "high",
          details: { count: n, path: req.originalUrl },
        });
        await autoBlock(ip, "auto: student enumeration", 1);
      }
    }

    if (method === "POST" && path.includes("/auth/login") && req.body?.email) {
      const email = String(req.body.email).toLowerCase();
      const n = await track(`anom:login_emails:${ip}:${email}`, 300);
      const distinct = await track(`anom:login_distinct:${ip}`, 300);
      if (distinct > 5) {
        writeSecurityAuditLog({
          eventType: "credential_stuffing",
          ipAddress: ip,
          severity: "critical",
          details: { distinctEmails: distinct },
        });
        await autoBlock(ip, "auto: credential stuffing", 6);
      }
      void email;
      void n;
    }

    if (method === "POST" && path.startsWith("/api/reports")) {
      const n = await track(`anom:reports:${ip}`, 120);
      if (n > 5) {
        writeSecurityAuditLog({
          eventType: "report_flooding",
          ipAddress: ip,
          userId: req.user?.id ?? null,
          severity: "medium",
          details: { count: n },
        });
      }
    }

    const total = await track(`anom:total:${ip}`, 300);
    if (total > env.AUTO_BLOCK_THRESHOLD) {
      writeSecurityAuditLog({
        eventType: "rate_limit_breach",
        ipAddress: ip,
        severity: "critical",
        details: { requests: total, threshold: env.AUTO_BLOCK_THRESHOLD },
      });
      await autoBlock(ip, "auto: rate limit breach", 24);
    }
  })();

  res.on("finish", () => {
    if (method === "POST" && path.includes("/fees/payments") && res.statusCode >= 400) {
      void track(`anom:fee_fail:${ip}`, 1800).then(async (n) => {
        if (n > 3) {
          writeSecurityAuditLog({
            eventType: "fee_payment_probing",
            ipAddress: ip,
            userId: req.user?.id ?? null,
            severity: "high",
            details: { failures: n },
          });
          await autoBlock(ip, "auto: fee payment probing", 0.5);
        }
      });
    }
  });

  next();
}
