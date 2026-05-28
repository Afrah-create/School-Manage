import type { SchoolSettings, UpdateSchoolSettingsInput } from "@uganda-cbc-sms/shared";
import { query } from "../../config/db";
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
  updated_at: string;
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
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function ensureSettingsRow(): Promise<void> {
  await query(
    `INSERT INTO school_settings (
       singleton, school_name, motto, vision, mission, logo_url, contact_email,
       contact_phone, website_url, postal_address, physical_address,
       primary_color, secondary_color, report_footer_text, updated_at
     )
     VALUES (
       TRUE, $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10,
       $11, $12, $13, NOW()
     )
     ON CONFLICT (singleton) DO NOTHING`,
    [
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
    ],
  );
}

export async function getSchoolSettings(): Promise<SchoolSettings> {
  await ensureSettingsRow();
  const { rows } = await query<SchoolSettingsRow>(
    `SELECT
       school_name, motto, vision, mission, logo_url, contact_email,
       contact_phone, website_url, postal_address, physical_address,
       primary_color, secondary_color, report_footer_text, updated_at
     FROM school_settings
     WHERE singleton = TRUE
     LIMIT 1`,
  );
  return mapRow(rows[0]!);
}

export async function updateSchoolSettings(
  input: UpdateSchoolSettingsInput,
  actorId: string,
): Promise<SchoolSettings> {
  await ensureSettingsRow();
  const { rows } = await query<SchoolSettingsRow>(
    `UPDATE school_settings
     SET
       school_name = $1,
       motto = $2,
       vision = $3,
       mission = $4,
       logo_url = $5,
       contact_email = $6,
       contact_phone = $7,
       website_url = $8,
       postal_address = $9,
       physical_address = $10,
       primary_color = $11,
       secondary_color = $12,
       report_footer_text = $13,
       updated_at = NOW()
     WHERE singleton = TRUE
     RETURNING
       school_name, motto, vision, mission, logo_url, contact_email,
       contact_phone, website_url, postal_address, physical_address,
       primary_color, secondary_color, report_footer_text, updated_at`,
    [
      input.schoolName,
      input.motto,
      input.vision,
      input.mission,
      input.logoUrl,
      input.contactEmail,
      input.contactPhone,
      input.websiteUrl,
      input.postalAddress,
      input.physicalAddress,
      input.primaryColor,
      input.secondaryColor,
      input.reportFooterText,
    ],
  );
  const updated = mapRow(rows[0]!);
  await writeAuditLog({
    category: "system",
    severity: "info",
    outcome: "success",
    action: "SCHOOL_SETTINGS_UPDATED",
    message: "School settings were updated",
    actorId,
    resourceType: "school_settings",
    metadata: {
      schoolName: updated.schoolName,
      hasLogo: Boolean(updated.logoUrl),
    },
  });
  return updated;
}
