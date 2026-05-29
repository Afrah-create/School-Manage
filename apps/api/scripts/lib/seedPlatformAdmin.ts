import bcrypt from "bcrypt";
import { platformPool } from "../../src/config/db.js";

export type SeedPlatformAdminResult = {
  email: string;
  fullName: string;
  created: boolean;
};

/**
 * Creates or updates the platform super-admin used to provision schools.
 * Requires migrations through 050_platform_admins (and 053 for audit, optional).
 */
export async function seedPlatformAdmin(): Promise<SeedPlatformAdminResult> {
  const email = (process.env.PLATFORM_ADMIN_EMAIL ?? "platform@school.local")
    .toLowerCase()
    .trim();
  const password =
    process.env.PLATFORM_ADMIN_PASSWORD ??
    process.env.ADMIN_PASSWORD ??
    process.env.SAMPLE_USERS_PASSWORD;
  if (!password) {
    throw new Error(
      "Set PLATFORM_ADMIN_PASSWORD, ADMIN_PASSWORD, or SAMPLE_USERS_PASSWORD in .env",
    );
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  const hash = await bcrypt.hash(password, rounds);
  const fullName = process.env.PLATFORM_ADMIN_NAME?.trim() || "Platform Super Admin";

  const existing = await platformPool.query<{ id: string }>(
    `SELECT id FROM platform_admins WHERE email = $1`,
    [email],
  );
  const created = !existing.rowCount;

  await platformPool.query(
    `INSERT INTO platform_admins (full_name, email, password_hash, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       is_active = TRUE,
       updated_at = NOW()`,
    [fullName, email, hash],
  );

  const adminId = (
    await platformPool.query<{ id: string }>(`SELECT id FROM platform_admins WHERE email = $1`, [
      email,
    ])
  ).rows[0]?.id;

  if (adminId) {
    const auditExists = await platformPool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'platform_audit_log'`,
    );
    if (auditExists.rowCount && auditExists.rowCount > 0) {
      await platformPool.query(
        `INSERT INTO platform_audit_log (actor_id, action, metadata)
         SELECT $1, 'PLATFORM_ADMIN_SEEDED', $2::jsonb
         WHERE NOT EXISTS (
           SELECT 1 FROM platform_audit_log
           WHERE action = 'PLATFORM_ADMIN_SEEDED' AND actor_id = $1
         )`,
        [adminId, JSON.stringify({ email, created })],
      );
    }
  }

  return { email, fullName, created };
}

export function printPlatformAdminBanner(result: SeedPlatformAdminResult): void {
  const slug = process.env.DEFAULT_TENANT_SLUG?.trim() || "default";
  console.log("");
  console.log("--- Platform super-admin (configure schools) ---");
  console.log(`  Email:    ${result.email}`);
  console.log(`  Name:     ${result.fullName}`);
  console.log(`  Sign in:  http://platform.localhost:3000/platform/login`);
  console.log(`  API:      POST http://localhost:5000/api/platform/auth/login`);
  console.log("");
  console.log("--- Default school (staff app) ---");
  console.log(`  URL:      http://${slug}.localhost:3000/login`);
  console.log(`  Admin:    ${process.env.ADMIN_EMAIL ?? "admin@school.local"}`);
  console.log("  Password: (ADMIN_PASSWORD / SAMPLE_USERS_PASSWORD from .env)");
  console.log("");
}
