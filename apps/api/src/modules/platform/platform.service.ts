import type { CreateTenantInput, UpdateTenantInput } from "@uganda-cbc-sms/shared";
import bcrypt from "bcrypt";
import { platformPool } from "../../config/db.js";
import { loadEnv } from "../../config/env.js";
import { setTenantLocal } from "../../config/tenant.js";
import { invalidateTenantCache } from "../../utils/tenantCache.js";
import { HttpError } from "../../utils/httpError.js";
import { generateTemporaryPassword } from "../../utils/generatePassword.js";
import { buildSignInUrl } from "../onboarding/onboarding.service.js";
import { logPlatformAction } from "./platformAudit.service.js";

export type TenantCredentials = {
  signInUrl: string;
  adminEmail: string;
  temporaryPassword: string;
  schoolName: string;
  slug: string;
};

export type TenantListItem = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  subdomain: string;
  schoolName: string | null;
  featureFlags: Record<string, boolean>;
  createdAt: string;
};

export type CreateTenantResult = TenantListItem & {
  credentials: TenantCredentials;
};

const DEFAULT_REPORT_LAYOUT = {
  template: "modern",
  density: "comfortable",
  showStudentPhoto: true,
  showTableStripes: true,
  headerAlignment: "left",
  cornerRadius: 4,
  baseFontSize: 9,
};

export async function listTenants(): Promise<TenantListItem[]> {
  const client = await platformPool.connect();
  try {
    const { rows } = await client.query<{
      id: string;
      slug: string;
      display_name: string;
      status: string;
      subdomain: string;
      school_name: string | null;
      feature_flags: Record<string, boolean> | null;
      created_at: Date;
    }>(
      `SELECT t.id, t.slug, t.display_name, t.status, d.subdomain,
              ts.school_name, ts.feature_flags, t.created_at
       FROM tenants t
       JOIN tenant_domains d ON d.tenant_id = t.id AND d.is_primary = TRUE
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       ORDER BY t.created_at DESC`,
    );
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      status: r.status,
      subdomain: r.subdomain,
      schoolName: r.school_name,
      featureFlags: (r.feature_flags ?? {}) as Record<string, boolean>,
      createdAt: r.created_at.toISOString(),
    }));
  } finally {
    client.release();
  }
}

export async function createTenant(
  input: CreateTenantInput,
  actorId: string,
): Promise<CreateTenantResult> {
  const env = loadEnv();
  const slug = input.slug.toLowerCase();
  const email = input.adminEmail.toLowerCase().trim();
  const signInUrl =
    typeof env.WEB_APP_URL === "string" && env.WEB_APP_URL.trim()
      ? `${env.WEB_APP_URL.trim().replace(/\/$/, "")}/login?school=${encodeURIComponent(slug)}`
      : buildSignInUrl(slug);
  const temporaryPassword = input.adminPassword?.trim() || generateTemporaryPassword();
  const hash = await bcrypt.hash(temporaryPassword, env.BCRYPT_ROUNDS);
  const adminName = input.adminFullName?.trim() || `${input.displayName} Administrator`;

  const client = await platformPool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(`SELECT 1 FROM tenants WHERE slug = $1`, [slug]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new HttpError(409, "A school with this slug already exists.");
    }

    const tenant = await client.query<{ id: string }>(
      `INSERT INTO tenants (slug, display_name, status)
       VALUES ($1, $2, 'active')
       RETURNING id`,
      [slug, input.displayName.trim()],
    );
    const tenantId = tenant.rows[0]!.id;

    // RLS: ensure tenant context is set before inserting into tenant-owned tables (e.g. `users`).
    await setTenantLocal(client, tenantId);

    await client.query(
      `INSERT INTO tenant_domains (tenant_id, subdomain, is_primary)
       VALUES ($1, $2, TRUE)`,
      [tenantId, slug],
    );

    await client.query(
      `INSERT INTO tenant_settings (
         tenant_id, school_name, motto, primary_color, secondary_color,
         report_footer_text, report_layout
       )
       VALUES ($1, $2, 'Learning with purpose', '#1D4ED8', '#0F172A',
         'This report is system-generated and valid without signature.',
         $3::jsonb)`,
      [tenantId, input.displayName.trim(), JSON.stringify(DEFAULT_REPORT_LAYOUT)],
    );

    await client.query(
      `INSERT INTO users (tenant_id, full_name, email, password_hash, role, is_active, force_password_change)
       VALUES ($1, $2, $3, $4, 'admin', TRUE, TRUE)`,
      [tenantId, adminName, email, hash],
    );

    await client.query("COMMIT");
    invalidateTenantCache(slug);
    await logPlatformAction({
      actorId,
      action: "TENANT_CREATED",
      tenantId,
      metadata: { slug, displayName: input.displayName.trim(), adminEmail: email },
    });
    return {
      id: tenantId,
      slug,
      displayName: input.displayName.trim(),
      status: "active",
      subdomain: slug,
      schoolName: input.displayName.trim(),
      featureFlags: {},
      createdAt: new Date().toISOString(),
      credentials: {
        signInUrl,
        adminEmail: email,
        temporaryPassword,
        schoolName: input.displayName.trim(),
        slug,
      },
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput,
  actorId: string,
): Promise<TenantListItem> {
  const client = await platformPool.connect();
  try {
    if (input.displayName !== undefined) {
      await client.query(
        `UPDATE tenants SET display_name = $2, updated_at = NOW() WHERE id = $1`,
        [tenantId, input.displayName.trim()],
      );
      await client.query(
        `UPDATE tenant_settings SET school_name = $2, updated_at = NOW() WHERE tenant_id = $1`,
        [tenantId, input.displayName.trim()],
      );
    }
    if (input.status !== undefined) {
      await client.query(
        `UPDATE tenants SET status = $2, updated_at = NOW() WHERE id = $1`,
        [tenantId, input.status],
      );
    }
    if (input.featureFlags !== undefined) {
      await client.query(
        `UPDATE tenant_settings
         SET feature_flags = COALESCE(feature_flags, '{}'::jsonb) || $2::jsonb,
             updated_at = NOW()
         WHERE tenant_id = $1`,
        [tenantId, JSON.stringify(input.featureFlags)],
      );
    }
    const { rows } = await client.query<{
      id: string;
      slug: string;
      display_name: string;
      status: string;
      subdomain: string;
      school_name: string | null;
      feature_flags: Record<string, boolean> | null;
      created_at: Date;
    }>(
      `SELECT t.id, t.slug, t.display_name, t.status, d.subdomain,
              ts.school_name, ts.feature_flags, t.created_at
       FROM tenants t
       JOIN tenant_domains d ON d.tenant_id = t.id AND d.is_primary = TRUE
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId],
    );
    if (!rows[0]) throw new HttpError(404, "Tenant not found.");
    const r = rows[0];
    invalidateTenantCache(r.slug);
    await logPlatformAction({
      actorId,
      action: "TENANT_UPDATED",
      tenantId,
      metadata: {
        displayName: input.displayName,
        status: input.status,
        featureFlags: input.featureFlags,
      },
    });
    return {
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      status: r.status,
      subdomain: r.subdomain,
      schoolName: r.school_name,
      featureFlags: (r.feature_flags ?? {}) as Record<string, boolean>,
      createdAt: r.created_at.toISOString(),
    };
  } finally {
    client.release();
  }
}

export async function suspendTenant(tenantId: string, actorId: string): Promise<TenantListItem> {
  const client = await platformPool.connect();
  try {
    const { rows } = await client.query<{ status: string; slug: string }>(
      `SELECT status, slug FROM tenants WHERE id = $1`,
      [tenantId],
    );
    if (!rows[0]) throw new HttpError(404, "Tenant not found.");
    if (rows[0].status === "suspended") {
      throw new HttpError(409, "School is already suspended.");
    }

    await client.query(`UPDATE tenants SET status = 'suspended', updated_at = NOW() WHERE id = $1`, [
      tenantId,
    ]);
    invalidateTenantCache(rows[0].slug);

    await logPlatformAction({
      actorId,
      action: "TENANT_SUSPENDED",
      tenantId,
      metadata: { previousStatus: rows[0].status },
    });

    const updated = await client.query<{
      id: string;
      slug: string;
      display_name: string;
      status: string;
      subdomain: string;
      school_name: string | null;
      feature_flags: Record<string, boolean> | null;
      created_at: Date;
    }>(
      `SELECT t.id, t.slug, t.display_name, t.status, d.subdomain,
              ts.school_name, ts.feature_flags, t.created_at
       FROM tenants t
       JOIN tenant_domains d ON d.tenant_id = t.id AND d.is_primary = TRUE
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId],
    );
    const r = updated.rows[0]!;
    return {
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      status: r.status,
      subdomain: r.subdomain,
      schoolName: r.school_name,
      featureFlags: (r.feature_flags ?? {}) as Record<string, boolean>,
      createdAt: r.created_at.toISOString(),
    };
  } finally {
    client.release();
  }
}

export async function activateTenant(tenantId: string, actorId: string): Promise<TenantListItem> {
  const client = await platformPool.connect();
  try {
    const { rows } = await client.query<{ status: string; slug: string }>(
      `SELECT status, slug FROM tenants WHERE id = $1`,
      [tenantId],
    );
    if (!rows[0]) throw new HttpError(404, "Tenant not found.");
    if (rows[0].status === "active") {
      throw new HttpError(409, "School is already active.");
    }

    await client.query(`UPDATE tenants SET status = 'active', updated_at = NOW() WHERE id = $1`, [
      tenantId,
    ]);
    invalidateTenantCache(rows[0].slug);

    await logPlatformAction({
      actorId,
      action: "TENANT_ACTIVATED",
      tenantId,
      metadata: { previousStatus: rows[0].status },
    });

    const updated = await client.query<{
      id: string;
      slug: string;
      display_name: string;
      status: string;
      subdomain: string;
      school_name: string | null;
      feature_flags: Record<string, boolean> | null;
      created_at: Date;
    }>(
      `SELECT t.id, t.slug, t.display_name, t.status, d.subdomain,
              ts.school_name, ts.feature_flags, t.created_at
       FROM tenants t
       JOIN tenant_domains d ON d.tenant_id = t.id AND d.is_primary = TRUE
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId],
    );
    const r = updated.rows[0]!;
    return {
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      status: r.status,
      subdomain: r.subdomain,
      schoolName: r.school_name,
      featureFlags: (r.feature_flags ?? {}) as Record<string, boolean>,
      createdAt: r.created_at.toISOString(),
    };
  } finally {
    client.release();
  }
}

export async function listPlatformAuditLog(limit = 50) {
  const client = await platformPool.connect();
  try {
  const { rows } = await client.query<{
    id: string;
    action: string;
    tenant_id: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
    actor_email: string | null;
  }>(
    `SELECT l.id, l.action, l.tenant_id, l.metadata, l.created_at, a.email AS actor_email
     FROM platform_audit_log l
     LEFT JOIN platform_admins a ON a.id = l.actor_id
     ORDER BY l.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    tenantId: r.tenant_id,
    metadata: r.metadata,
    createdAt: r.created_at.toISOString(),
    actorEmail: r.actor_email,
  }));
  } finally {
    client.release();
  }
}

export async function resetTenantAdminPassword(
  tenantId: string,
  newPassword: string,
  actorId: string,
): Promise<void> {
  const env = loadEnv();
  const hash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  const client = await platformPool.connect();
  try {
    const { rowCount } = await client.query(
      `UPDATE users
       SET password_hash = $2, force_password_change = TRUE, updated_at = NOW()
       WHERE tenant_id = $1 AND role = 'admin' AND deleted_at IS NULL`,
      [tenantId, hash],
    );
    if (!rowCount) {
      throw new HttpError(404, "No active school admin found for this tenant.");
    }
    await logPlatformAction({
      actorId,
      action: "TENANT_ADMIN_PASSWORD_RESET",
      tenantId,
    });
  } finally {
    client.release();
  }
}
