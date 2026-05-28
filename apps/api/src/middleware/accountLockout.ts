import { query } from "../config/db.js";
import { loadEnv } from "../config/env.js";

export function logLoginAttempt(
  identifier: string,
  ipAddress: string | null | undefined,
  success: boolean,
): void {
  void query(
    `INSERT INTO login_attempts (identifier, ip_address, success) VALUES ($1, $2::inet, $3)`,
    [identifier.toLowerCase().trim(), ipAddress ?? null, success],
  ).catch((err) => {
    console.error("[login_attempts]", err instanceof Error ? err.message : err);
  });
}

export async function countRecentFailedAttempts(identifier: string): Promise<number> {
  const { rows } = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM login_attempts
     WHERE identifier = $1 AND success = false AND attempted_at > NOW() - interval '15 minutes'`,
    [identifier.toLowerCase().trim()],
  );
  return rows[0]?.c ?? 0;
}

export async function clearLoginAttemptsForEmail(email: string): Promise<void> {
  await query(`DELETE FROM login_attempts WHERE identifier = $1`, [email.toLowerCase().trim()]);
}

export function maxLoginAttempts(): number {
  return loadEnv().MAX_LOGIN_ATTEMPTS;
}
