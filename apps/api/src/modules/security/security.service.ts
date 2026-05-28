import { query } from "../../config/db.js";
import { blockIpAddress } from "../../middleware/ipBlocklist.js";
import { HttpError } from "../../utils/httpError.js";

export async function blockIp(input: {
  ip: string;
  reason: string;
  blockedBy: string;
  expiresAt?: string | null;
}): Promise<void> {
  const expires = input.expiresAt ? new Date(input.expiresAt) : null;
  await blockIpAddress({
    ip: input.ip,
    reason: input.reason,
    blockedBy: input.blockedBy,
    expiresAt: expires,
  });
}

export async function listSecurityAuditLog(params: {
  severity?: string;
  from?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 50, 200);
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const vals: unknown[] = [];

  if (params.severity) {
    vals.push(params.severity);
    conditions.push(`severity = $${vals.length}`);
  }
  if (params.from) {
    vals.push(params.from);
    conditions.push(`created_at >= $${vals.length}::timestamptz`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await query<{
    id: string;
    event_type: string;
    ip_address: string | null;
    user_id: string | null;
    details: unknown;
    severity: string;
    created_at: Date;
  }>(
    `SELECT id::text, event_type, ip_address::text, user_id::text, details, severity, created_at
     FROM security_audit_log ${where}
     ORDER BY created_at DESC
     LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
    [...vals, limit, offset],
  );

  const count = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM security_audit_log ${where}`,
    vals,
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      ipAddress: r.ip_address,
      userId: r.user_id,
      details: r.details,
      severity: r.severity,
      createdAt: r.created_at.toISOString(),
    })),
    page,
    limit,
    total: count.rows[0]?.c ?? 0,
  };
}

export async function apiUsageMetrics(from: string, to: string) {
  const { rows: topPaths } = await query<{ path: string; c: number; avg_ms: number }>(
    `SELECT path, COUNT(*)::int AS c, AVG(response_time_ms)::int AS avg_ms
     FROM api_request_log
     WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz
     GROUP BY path ORDER BY c DESC LIMIT 10`,
    [from, to],
  );

  const { rows: cacheStats } = await query<{ hits: number; total: number }>(
    `SELECT
       SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::int AS hits,
       COUNT(*)::int AS total
     FROM api_request_log
     WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz`,
    [from, to],
  );

  const { rows: byHour } = await query<{ hour: number; c: number }>(
    `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS c
     FROM api_request_log
     WHERE created_at >= $1::timestamptz AND created_at <= $2::timestamptz
     GROUP BY hour ORDER BY hour`,
    [from, to],
  );

  const hits = cacheStats[0]?.hits ?? 0;
  const total = cacheStats[0]?.total ?? 0;

  return {
    topEndpoints: topPaths,
    cacheHitRate: total > 0 ? Math.round((hits / total) * 100) : 0,
    requestsByHour: byHour,
    totalRequests: total,
  };
}

export function parseBlockIpBody(body: unknown): { ip: string; reason: string; expiresAt?: string | null } {
  if (!body || typeof body !== "object") throw new HttpError(400, "Invalid body");
  const b = body as Record<string, unknown>;
  if (typeof b.ip !== "string" || !b.ip.trim()) throw new HttpError(400, "ip is required");
  if (typeof b.reason !== "string" || !b.reason.trim()) throw new HttpError(400, "reason is required");
  return {
    ip: b.ip.trim(),
    reason: b.reason.trim(),
    expiresAt: typeof b.expiresAt === "string" ? b.expiresAt : b.expiresAt === null ? null : undefined,
  };
}
