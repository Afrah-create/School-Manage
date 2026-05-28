import type { NextFunction, Request, Response } from "express";
import { query } from "../config/db.js";

type BlockRow = { ip_address: string };

let cache: Set<string> = new Set();
let lastRefresh = 0;
const REFRESH_MS = 60_000;

async function refreshBlocklist(): Promise<void> {
  const { rows } = await query<BlockRow>(
    `SELECT ip_address::text AS ip_address FROM ip_blocklist
     WHERE expires_at IS NULL OR expires_at > NOW()`,
  );
  cache = new Set(rows.map((r) => r.ip_address));
  lastRefresh = Date.now();
}

export async function ipBlocklistMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (Date.now() - lastRefresh > REFRESH_MS) {
    try {
      await refreshBlocklist();
    } catch (err) {
      console.error("[ip_blocklist]", err instanceof Error ? err.message : err);
    }
  }
  const ip = req.ip ?? "";
  if (ip && cache.has(ip)) {
    res.status(403).json({ success: false, error: "Access denied.", code: "FORBIDDEN" });
    return;
  }
  next();
}

export async function blockIpAddress(opts: {
  ip: string;
  reason: string;
  blockedBy?: string | null;
  expiresAt?: Date | null;
}): Promise<void> {
  await query(
    `INSERT INTO ip_blocklist (ip_address, reason, blocked_by, expires_at)
     VALUES ($1::inet, $2, $3, $4)
     ON CONFLICT (ip_address) DO UPDATE SET reason = EXCLUDED.reason, blocked_at = NOW(),
       blocked_by = EXCLUDED.blocked_by, expires_at = EXCLUDED.expires_at`,
    [opts.ip, opts.reason, opts.blockedBy ?? null, opts.expiresAt ?? null],
  );
  cache.add(opts.ip);
}

export function invalidateBlocklistCache(): void {
  lastRefresh = 0;
}
