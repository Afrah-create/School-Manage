import { mergeAssessmentConfig, type AssessmentConfig } from "@uganda-cbc-sms/shared";
import { query } from "../config/db";
import { activeTenantIdFromContext } from "./activeTenant.js";

export async function loadAssessmentConfig(tenantId?: string): Promise<AssessmentConfig> {
  const tid = tenantId ?? activeTenantIdFromContext();
  const { rows } = await query<{ assessment_config: Record<string, unknown> | null }>(
    `SELECT assessment_config FROM tenant_settings WHERE tenant_id = $1 LIMIT 1`,
    [tid],
  );
  return mergeAssessmentConfig(rows[0]?.assessment_config as Partial<AssessmentConfig> | undefined);
}

export async function saveAssessmentConfig(
  partial: Partial<AssessmentConfig>,
  tenantId?: string,
): Promise<AssessmentConfig> {
  const tid = tenantId ?? activeTenantIdFromContext();
  const current = await loadAssessmentConfig(tid);
  const merged = mergeAssessmentConfig({
    ...current,
    ...partial,
    projectWork: partial.projectWork
      ? { ...current.projectWork, ...partial.projectWork }
      : current.projectWork,
    caRules: partial.caRules
      ? {
          ...current.caRules,
          ...partial.caRules,
          fallbackRatingScoreMap: partial.caRules.fallbackRatingScoreMap
            ? { ...current.caRules.fallbackRatingScoreMap, ...partial.caRules.fallbackRatingScoreMap }
            : (partial.caRules as { ratingScoreMap?: Record<string, number> }).ratingScoreMap
              ? {
                  ...current.caRules.fallbackRatingScoreMap,
                  ...(partial.caRules as { ratingScoreMap?: Record<string, number> }).ratingScoreMap,
                }
              : current.caRules.fallbackRatingScoreMap,
        }
      : current.caRules,
  });
  await query(
    `UPDATE tenant_settings SET assessment_config = $2::jsonb, updated_at = NOW() WHERE tenant_id = $1`,
    [tid, JSON.stringify(merged)],
  );
  return merged;
}

export async function loadGradingConfig(tenantId?: string): Promise<{
  oLevel: { scheme: string };
  aLevel: { scheme: string };
}> {
  const tid = tenantId ?? activeTenantIdFromContext();
  const { rows } = await query<{ grading_config: Record<string, unknown> | null }>(
    `SELECT grading_config FROM tenant_settings WHERE tenant_id = $1 LIMIT 1`,
    [tid],
  );
  const raw = rows[0]?.grading_config ?? {};
  return {
    oLevel: { scheme: (raw.oLevel as { scheme?: string })?.scheme ?? "cbc_2024_v1" },
    aLevel: { scheme: (raw.aLevel as { scheme?: string })?.scheme ?? "legacy_uneb_points_v1" },
  };
}

export async function getGradingScheme(
  level: "O_LEVEL" | "A_LEVEL",
  tenantId?: string,
): Promise<string> {
  const cfg = await loadGradingConfig(tenantId);
  return level === "O_LEVEL" ? cfg.oLevel.scheme : cfg.aLevel.scheme;
}
