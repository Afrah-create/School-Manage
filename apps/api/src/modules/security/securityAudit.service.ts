import { query } from "../../config/db.js";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export function writeSecurityAuditLog(entry: {
  eventType: string;
  ipAddress?: string | null;
  userId?: string | null;
  details?: Record<string, unknown>;
  severity?: SecuritySeverity;
}): void {
  void query(
    `INSERT INTO security_audit_log (event_type, ip_address, user_id, details, severity)
     VALUES ($1, $2::inet, $3, $4::jsonb, $5)`,
    [
      entry.eventType,
      entry.ipAddress ?? null,
      entry.userId ?? null,
      JSON.stringify(entry.details ?? {}),
      entry.severity ?? "medium",
    ],
  ).catch((err) => {
    console.error("[security_audit_log]", err instanceof Error ? err.message : err);
  });
}
