import type { TenantFeatureFlagKey } from "@uganda-cbc-sms/shared";
import { DEFAULT_TENANT_FEATURE_FLAGS } from "@uganda-cbc-sms/shared";
import { query } from "./db.js";

export type TenantFeatureFlags = Record<TenantFeatureFlagKey, boolean>;

export async function loadTenantFeatureFlags(tenantId: string): Promise<TenantFeatureFlags> {
  const { rows } = await query<{ feature_flags: Record<string, unknown> | null }>(
    `SELECT feature_flags FROM tenant_settings WHERE tenant_id = $1`,
    [tenantId],
  );
  const raw = rows[0]?.feature_flags ?? {};
  const out = { ...DEFAULT_TENANT_FEATURE_FLAGS };
  for (const key of Object.keys(DEFAULT_TENANT_FEATURE_FLAGS) as TenantFeatureFlagKey[]) {
    if (typeof raw[key] === "boolean") {
      out[key] = raw[key];
    }
  }
  return out;
}

export function isFeatureEnabled(flags: TenantFeatureFlags, key: TenantFeatureFlagKey): boolean {
  return flags[key] !== false;
}
