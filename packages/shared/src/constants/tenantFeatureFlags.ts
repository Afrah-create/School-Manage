/** Keys stored in tenant_settings.feature_flags (JSONB). Omitted keys default to enabled. */
export const TENANT_FEATURE_FLAG_KEYS = [
  "fees",
  "exams",
  "alevel",
  "timetable",
  "attendance",
  "analytics",
] as const;

export type TenantFeatureFlagKey = (typeof TENANT_FEATURE_FLAG_KEYS)[number];

export const DEFAULT_TENANT_FEATURE_FLAGS: Record<TenantFeatureFlagKey, boolean> = {
  fees: true,
  exams: true,
  alevel: true,
  timetable: true,
  attendance: true,
  analytics: true,
};
