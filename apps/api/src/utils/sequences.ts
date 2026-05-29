import type { PoolClient } from "pg";
import { tenantContext } from "../config/db.js";
import { HttpError } from "./httpError.js";

/** Atomic per-tenant sequence; first value is 1. */
export async function nextSequence(
  client: { query: PoolClient["query"] },
  key: string,
  tenantId?: string,
): Promise<number> {
  const tid = tenantId ?? tenantContext.getStore();
  if (!tid) {
    throw new HttpError(400, "School context is required to generate student numbers.");
  }
  const { rows } = await client.query<{ value: string }>(
    `INSERT INTO _sequences (tenant_id, name, value) VALUES ($1, $2, 1)
     ON CONFLICT (tenant_id, name) DO UPDATE SET value = _sequences.value + 1
     RETURNING value`,
    [tid, key],
  );
  return Number(rows[0]!.value);
}

export function padNumber(n: number, width: number): string {
  return String(n).padStart(width, "0");
}
