import "dotenv/config";
import bcrypt from "bcrypt";
import type { Role } from "@uganda-cbc-sms/shared";
import { pool } from "../src/config/db";

const SAMPLE_USERS: Array<{ fullName: string; email: string; role: Role }> = [
  { fullName: "System Administrator", email: "admin@school.local", role: "admin" },
  { fullName: "School Headteacher", email: "headteacher@school.local", role: "headteacher" },
  { fullName: "Class Teacher", email: "classteacher@school.local", role: "class_teacher" },
  { fullName: "Subject Teacher", email: "subjectteacher@school.local", role: "subject_teacher" },
  { fullName: "Bursar Officer", email: "bursar@school.local", role: "bursar" },
];

async function main(): Promise<void> {
  const sharedPassword = process.env.SAMPLE_USERS_PASSWORD ?? process.env.ADMIN_PASSWORD;
  if (!sharedPassword) {
    console.error("Set SAMPLE_USERS_PASSWORD (or ADMIN_PASSWORD) in .env");
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  const hash = await bcrypt.hash(sharedPassword, rounds);
  const usersToSeed = SAMPLE_USERS.map((item) =>
    item.role === "admin" && adminEmail ? { ...item, email: adminEmail } : item,
  );

  for (const user of usersToSeed) {
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         is_active = true,
         password_hash = EXCLUDED.password_hash,
         updated_at = NOW()`,
      [user.fullName, user.email.toLowerCase().trim(), hash, user.role],
    );
    console.log(`Seeded user: ${user.email} (${user.role})`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
