import type { SchoolSettings, UpdateSchoolSettingsInput } from "@uganda-cbc-sms/shared";
import { query } from "../../config/db";
import type { TenantFeatureFlags } from "../../config/featureFlags.js";
import { loadTenantFeatureFlags } from "../../config/featureFlags.js";
import { activeTenantIdFromContext } from "../../utils/activeTenant.js";
import { writeAuditLog } from "../audit/audit.service";

type SchoolSettingsRow = {
  school_name: string;
  motto: string | null;
  vision: string | null;
  mission: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  postal_address: string | null;
  physical_address: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  report_footer_text: string | null;
  report_layout: Record<string, unknown> | null;
  updated_at: string;
};

const DEFAULT_LAYOUT: NonNullable<SchoolSettings["reportLayout"]> = {
  template: "modern",
  density: "comfortable",
  showStudentPhoto: true,
  showTableStripes: true,
  headerAlignment: "left",
  cornerRadius: 4,
  baseFontSize: 9,
};

const DEFAULT_SETTINGS: Omit<SchoolSettings, "updatedAt"> = {
  schoolName: "Uganda CBC SMS School",
  motto: "Learning with purpose",
  vision: null,
  mission: null,
  logoUrl: null,
  contactEmail: null,
  contactPhone: null,
  websiteUrl: null,
  postalAddress: null,
  physicalAddress: null,
  primaryColor: "#1D4ED8",
  secondaryColor: "#0F172A",
  reportFooterText: "This report is system-generated and valid without signature.",
  reportLayout: DEFAULT_LAYOUT,
};

function mapRow(row: SchoolSettingsRow): SchoolSettings {
  return {
    schoolName: row.school_name,
    motto: row.motto,
    vision: row.vision,
    mission: row.mission,
    logoUrl: row.logo_url,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    websiteUrl: row.website_url,
    postalAddress: row.postal_address,
    physicalAddress: row.physical_address,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    reportFooterText: row.report_footer_text,
    reportLayout: {
      ...DEFAULT_LAYOUT,
      ...(row.report_layout ?? {}),
    } as SchoolSettings["reportLayout"],
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function resolveTenantId(tenantId?: string): string {
  return tenantId ?? activeTenantIdFromContext();
}

async function ensureSettingsRow(tenantId: string): Promise<void> {
  await query(
    `INSERT INTO tenant_settings (
       tenant_id, school_name, motto, vision, mission, logo_url, contact_email,
       contact_phone, website_url, postal_address, physical_address,
       primary_color, secondary_color, report_footer_text, report_layout, updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11,
       $12, $13, $14, $15::jsonb, NOW()
     )
     ON CONFLICT (tenant_id) DO NOTHING`,
    [
      tenantId,
      DEFAULT_SETTINGS.schoolName,
      DEFAULT_SETTINGS.motto,
      DEFAULT_SETTINGS.vision,
      DEFAULT_SETTINGS.mission,
      DEFAULT_SETTINGS.logoUrl,
      DEFAULT_SETTINGS.contactEmail,
      DEFAULT_SETTINGS.contactPhone,
      DEFAULT_SETTINGS.websiteUrl,
      DEFAULT_SETTINGS.postalAddress,
      DEFAULT_SETTINGS.physicalAddress,
      DEFAULT_SETTINGS.primaryColor,
      DEFAULT_SETTINGS.secondaryColor,
      DEFAULT_SETTINGS.reportFooterText,
      JSON.stringify(DEFAULT_SETTINGS.reportLayout),
    ],
  );
}

export type SchoolSettingsWithFlags = SchoolSettings & {
  featureFlags: TenantFeatureFlags;
};

export async function getSchoolSettings(tenantId?: string): Promise<SchoolSettingsWithFlags> {
  const tid = resolveTenantId(tenantId);
  await ensureSettingsRow(tid);
  const { rows } = await query<SchoolSettingsRow>(
    `SELECT
       school_name, motto, vision, mission, logo_url, contact_email,
       contact_phone, website_url, postal_address, physical_address,
       primary_color, secondary_color, report_footer_text, report_layout, updated_at
     FROM tenant_settings
     WHERE tenant_id = $1
     LIMIT 1`,
    [tid],
  );
  const featureFlags = await loadTenantFeatureFlags(tid);
  return { ...mapRow(rows[0]!), featureFlags };
}

export async function updateSchoolSettings(
  input: Partial<UpdateSchoolSettingsInput>,
  actorId: string,
  tenantId?: string,
): Promise<SchoolSettingsWithFlags> {
  const tid = resolveTenantId(tenantId);
  await ensureSettingsRow(tid);
  const current = await getSchoolSettings(tid);
  const merged: Omit<SchoolSettings, "updatedAt"> = {
    schoolName: input.schoolName?.trim() || current.schoolName,
    motto: input.motto !== undefined ? input.motto : current.motto,
    vision: input.vision !== undefined ? input.vision : current.vision,
    mission: input.mission !== undefined ? input.mission : current.mission,
    logoUrl: input.logoUrl !== undefined ? input.logoUrl : current.logoUrl,
    contactEmail: input.contactEmail !== undefined ? input.contactEmail : current.contactEmail,
    contactPhone: input.contactPhone !== undefined ? input.contactPhone : current.contactPhone,
    websiteUrl: input.websiteUrl !== undefined ? input.websiteUrl : current.websiteUrl,
    postalAddress: input.postalAddress !== undefined ? input.postalAddress : current.postalAddress,
    physicalAddress: input.physicalAddress !== undefined ? input.physicalAddress : current.physicalAddress,
    primaryColor: input.primaryColor !== undefined ? input.primaryColor : current.primaryColor,
    secondaryColor: input.secondaryColor !== undefined ? input.secondaryColor : current.secondaryColor,
    reportFooterText: input.reportFooterText !== undefined ? input.reportFooterText : current.reportFooterText,
    reportLayout:
      input.reportLayout !== undefined
        ? { ...DEFAULT_LAYOUT, ...(current.reportLayout ?? {}), ...(input.reportLayout ?? {}) }
        : (current.reportLayout ?? DEFAULT_LAYOUT),
  };
  const { rows } = await query<SchoolSettingsRow>(
    `UPDATE tenant_settings
     SET
       school_name = $2,
       motto = $3,
       vision = $4,
       mission = $5,
       logo_url = $6,
       contact_email = $7,
       contact_phone = $8,
       website_url = $9,
       postal_address = $10,
       physical_address = $11,
       primary_color = $12,
       secondary_color = $13,
       report_footer_text = $14,
       report_layout = $15::jsonb,
       updated_at = NOW()
     WHERE tenant_id = $1
     RETURNING
       school_name, motto, vision, mission, logo_url, contact_email,
       contact_phone, website_url, postal_address, physical_address,
       primary_color, secondary_color, report_footer_text, report_layout, updated_at`,
    [
      tid,
      merged.schoolName,
      merged.motto,
      merged.vision,
      merged.mission,
      merged.logoUrl,
      merged.contactEmail,
      merged.contactPhone,
      merged.websiteUrl,
      merged.postalAddress,
      merged.physicalAddress,
      merged.primaryColor,
      merged.secondaryColor,
      merged.reportFooterText,
      JSON.stringify(merged.reportLayout ?? DEFAULT_LAYOUT),
    ],
  );
  const featureFlags = await loadTenantFeatureFlags(tid);
  const updated = { ...mapRow(rows[0]!), featureFlags };
  await writeAuditLog({
    category: "system",
    severity: "info",
    outcome: "success",
    action: "SCHOOL_SETTINGS_UPDATED",
    message: "School settings were updated",
    actorId,
    resourceType: "tenant_settings",
    metadata: {
      schoolName: updated.schoolName,
      hasLogo: Boolean(updated.logoUrl),
      tenantId: tid,
    },
  });
  return updated;
}

export async function setSchoolLogo(
  logoUrl: string,
  actorId: string,
  tenantId?: string,
): Promise<SchoolSettingsWithFlags> {
  const tid = resolveTenantId(tenantId);
  await ensureSettingsRow(tid);
  const { rows } = await query<SchoolSettingsRow>(
    `UPDATE tenant_settings
     SET logo_url = $2, updated_at = NOW()
     WHERE tenant_id = $1
     RETURNING
       school_name, motto, vision, mission, logo_url, contact_email,
       contact_phone, website_url, postal_address, physical_address,
       primary_color, secondary_color, report_footer_text, report_layout, updated_at`,
    [tid, logoUrl],
  );
  const featureFlags = await loadTenantFeatureFlags(tid);
  const updated = { ...mapRow(rows[0]!), featureFlags };
  await writeAuditLog({
    category: "system",
    severity: "info",
    outcome: "success",
    action: "SCHOOL_LOGO_UPDATED",
    message: "School logo was updated",
    actorId,
    resourceType: "tenant_settings",
    metadata: { logoUrl, tenantId: tid },
  });
  return updated;
}
