import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import type { Role } from "@uganda-cbc-sms/shared";
import { pool, platformPool } from "../src/config/db";
import { printPlatformAdminBanner, seedPlatformAdmin } from "./lib/seedPlatformAdmin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function ensureDefaultTenant(): Promise<string> {
  const slug = process.env.DEFAULT_TENANT_SLUG?.trim() || "default";
  const displayName = process.env.DEFAULT_TENANT_NAME?.trim() || "Default School";
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO tenants (slug, display_name, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [slug, displayName],
  );
  const tenantId = rows[0]!.id;
  await pool.query(
    `INSERT INTO tenant_domains (tenant_id, subdomain, is_primary)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (subdomain) DO NOTHING`,
    [tenantId, slug],
  );
  await pool.query(
    `INSERT INTO tenant_settings (tenant_id, school_name, motto, primary_color, secondary_color, report_footer_text)
     VALUES ($1, $2, 'Learning with purpose', '#1D4ED8', '#0F172A',
       'This report is system-generated and valid without signature.')
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId, displayName],
  );
  return tenantId;
}

const SAMPLE_USERS: Array<{ fullName: string; email: string; role: Role }> = [
  { fullName: "System Administrator", email: "admin@school.local", role: "admin" },
  { fullName: "School Headteacher", email: "headteacher@school.local", role: "headteacher" },
  { fullName: "Class Teacher", email: "classteacher@school.local", role: "class_teacher" },
  { fullName: "Subject Teacher", email: "subjectteacher@school.local", role: "subject_teacher" },
  { fullName: "Bursar Officer", email: "bursar@school.local", role: "bursar" },
];

type RefIds = {
  classTeacherId: string | null;
  subjectTeacherId: string | null;
  yearId: string;
  termId: string;
  oLevelClassId: string;
  aLevelClassId: string;
  comboId: string;
};

type StudentSeed = {
  studentNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  guardianName: string;
  guardianContact: string;
  classId: string;
  combinationId: string | null;
};

function buildSampleStudents(refs: RefIds): StudentSeed[] {
  const firstNames = [
    "Amina",
    "Brian",
    "Clara",
    "David",
    "Esther",
    "Farouk",
    "Grace",
    "Henry",
    "Irene",
    "James",
    "Kevin",
    "Lilian",
    "Moses",
    "Naomi",
    "Oscar",
    "Patricia",
    "Queen",
    "Robert",
    "Sarah",
    "Timothy",
  ];
  const lastNames = [
    "Nabirye",
    "Ssenkumba",
    "Atwine",
    "Okello",
    "Nansubuga",
    "Kato",
    "Namara",
    "Tumusiime",
    "Mugisha",
    "Achieng",
  ];

  return firstNames.map((first, idx) => {
    const last = lastNames[idx % lastNames.length]!;
    const year = 2026;
    const serial = String(idx + 1).padStart(4, "0");
    const isALevel = idx >= 14;
    const month = String((idx % 12) + 1).padStart(2, "0");
    const day = String(((idx * 2) % 27) + 1).padStart(2, "0");
    return {
      studentNumber: `SMS-${year}-${serial}`,
      fullName: `${first} ${last}`,
      dateOfBirth: `${2008 + (idx % 4)}-${month}-${day}`,
      gender: idx % 2 === 0 ? "female" : "male",
      guardianName: `${last} Parent`,
      guardianContact: `070000${String(100 + idx).padStart(3, "0")}`,
      classId: isALevel ? refs.aLevelClassId : refs.oLevelClassId,
      combinationId: isALevel ? refs.comboId : null,
    };
  });
}

async function ensureAcademicBaseline(
  tenantId: string,
  classTeacherId: string | null,
  subjectTeacherId: string | null,
): Promise<RefIds> {
  const yearName = process.env.SAMPLE_ACADEMIC_YEAR_NAME ?? "2026";
  let yearId =
    (
      await pool.query<{ id: string }>(
        `SELECT id FROM academic_years WHERE tenant_id = $1 AND name = $2 ORDER BY created_at DESC LIMIT 1`,
        [tenantId, yearName],
      )
    ).rows[0]?.id ?? null;
  if (!yearId) {
    const year = await pool.query<{ id: string }>(
      `INSERT INTO academic_years (tenant_id, name, start_date, end_date, is_active)
       VALUES ($1, $2, '2026-02-03', '2026-12-04', true)
       RETURNING id`,
      [tenantId, yearName],
    );
    yearId = year.rows[0]?.id ?? null;
  }
  if (!yearId) {
    throw new Error("Could not create or locate academic year for student seed");
  }

  await pool.query(`UPDATE academic_years SET is_active = (id = $1)`, [yearId]);

  let termId =
    (
      await pool.query<{ id: string }>(
        `SELECT id FROM terms WHERE academic_year_id = $1 AND term_number = 1 ORDER BY created_at DESC LIMIT 1`,
        [yearId],
      )
    ).rows[0]?.id ?? null;
  if (!termId) {
    const term = await pool.query<{ id: string }>(
      `INSERT INTO terms (tenant_id, academic_year_id, term_number, start_date, end_date, is_active)
       VALUES ($1, $2, 1, '2026-02-03', '2026-05-02', true)
       RETURNING id`,
      [tenantId, yearId],
    );
    termId = term.rows[0]?.id ?? null;
  }
  if (!termId) {
    throw new Error("Could not create or locate term for student seed");
  }
  await pool.query(`UPDATE terms SET is_active = (id = $1)`, [termId]);

  let oLevelClassId =
    (
      await pool.query<{ id: string }>(
        `SELECT id FROM classes
         WHERE tenant_id = $1 AND name = 'S2' AND stream = 'North' AND level = 'O_LEVEL' AND academic_year_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, yearId],
      )
    ).rows[0]?.id ?? null;
  if (!oLevelClassId) {
    const oLevel = await pool.query<{ id: string }>(
      `INSERT INTO classes (tenant_id, name, stream, level, academic_year_id, class_teacher_id)
       VALUES ($1, 'S2', 'North', 'O_LEVEL', $2, $3)
       RETURNING id`,
      [tenantId, yearId, classTeacherId],
    );
    oLevelClassId = oLevel.rows[0]?.id ?? null;
  }
  if (!oLevelClassId) {
    throw new Error("Could not create or locate O-Level class for student seed");
  }

  let aLevelClassId =
    (
      await pool.query<{ id: string }>(
        `SELECT id FROM classes
         WHERE tenant_id = $1 AND name = 'S5' AND stream = 'South' AND level = 'A_LEVEL' AND academic_year_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, yearId],
      )
    ).rows[0]?.id ?? null;
  if (!aLevelClassId) {
    const aLevel = await pool.query<{ id: string }>(
      `INSERT INTO classes (tenant_id, name, stream, level, academic_year_id, class_teacher_id)
       VALUES ($1, 'S5', 'South', 'A_LEVEL', $2, $3)
       RETURNING id`,
      [tenantId, yearId, classTeacherId],
    );
    aLevelClassId = aLevel.rows[0]?.id ?? null;
  }
  if (!aLevelClassId) {
    throw new Error("Could not create or locate A-Level class for student seed");
  }

  let comboId =
    (
      await pool.query<{ id: string }>(
        `SELECT id FROM subject_combinations WHERE tenant_id = $1 AND code = 'PCM' ORDER BY id LIMIT 1`,
        [tenantId],
      )
    ).rows[0]?.id ?? null;
  if (!comboId) {
    const combo = await pool.query<{ id: string }>(
      `INSERT INTO subject_combinations (tenant_id, code, name, level, subjects)
       VALUES ($1, 'PCM', 'Physics, Chemistry, Mathematics', 'A_LEVEL', '["Physics","Chemistry","Mathematics"]'::jsonb)
       ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tenantId],
    );
    comboId = combo.rows[0]?.id ?? null;
  }
  if (!comboId) {
    throw new Error("Could not create or locate A-Level subject combination for student seed");
  }

  if (subjectTeacherId) {
    await pool.query(
      `INSERT INTO subjects (tenant_id, name, code, level)
       VALUES ($1, 'Mathematics', 'MATH-SMS', 'O_LEVEL')
       ON CONFLICT (tenant_id, code) DO NOTHING`,
      [tenantId],
    );
    const subject = await pool.query<{ id: string }>(
      `SELECT id FROM subjects WHERE tenant_id = $1 AND code = 'MATH-SMS' LIMIT 1`,
      [tenantId],
    );
    const subjectId = subject.rows[0]?.id ?? null;
    if (subjectId) {
      await pool.query(
        `INSERT INTO class_subjects (tenant_id, class_id, subject_id, teacher_id, academic_year_id, term_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (class_id, subject_id, academic_year_id)
         DO UPDATE SET teacher_id = EXCLUDED.teacher_id, term_id = EXCLUDED.term_id`,
        [tenantId, oLevelClassId, subjectId, subjectTeacherId, yearId, termId],
      );
    }
  }

  return { classTeacherId, subjectTeacherId, yearId, termId, oLevelClassId, aLevelClassId, comboId };
}

async function seedSampleStudents(tenantId: string, refs: RefIds): Promise<void> {
  const students = buildSampleStudents(refs);
  for (const s of students) {
    await pool.query(
      `INSERT INTO students (
        tenant_id, student_number, full_name, date_of_birth, gender, guardian_name, guardian_contact, class_id, combination_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tenant_id, student_number)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        guardian_name = EXCLUDED.guardian_name,
        guardian_contact = EXCLUDED.guardian_contact,
        class_id = EXCLUDED.class_id,
        combination_id = EXCLUDED.combination_id,
        status = 'active',
        updated_at = NOW()`,
      [
        tenantId,
        s.studentNumber,
        s.fullName,
        s.dateOfBirth,
        s.gender,
        s.guardianName,
        s.guardianContact,
        s.classId,
        s.combinationId,
      ],
    );
    console.log(`Seeded student: ${s.studentNumber} (${s.fullName})`);
  }
}

async function main(): Promise<void> {
  const sharedPassword = process.env.SAMPLE_USERS_PASSWORD ?? process.env.ADMIN_PASSWORD;
  if (!sharedPassword) {
    console.error("Set SAMPLE_USERS_PASSWORD (or ADMIN_PASSWORD) in .env");
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  const hash = await bcrypt.hash(sharedPassword, rounds);
  const tenantId = await ensureDefaultTenant();
  console.log(`Using tenant: ${tenantId}`);

  const usersToSeed = SAMPLE_USERS.map((item) =>
    item.role === "admin" && adminEmail ? { ...item, email: adminEmail } : item,
  );

  for (const user of usersToSeed) {
    await pool.query(
      `INSERT INTO users (tenant_id, full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (tenant_id, email)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         is_active = true,
         password_hash = EXCLUDED.password_hash,
         updated_at = NOW()`,
      [tenantId, user.fullName, user.email.toLowerCase().trim(), hash, user.role],
    );
    console.log(`Seeded user: ${user.email} (${user.role})`);
  }

  const classTeacherId =
    (
      await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE role = 'class_teacher' ORDER BY created_at ASC LIMIT 1`,
      )
    ).rows[0]?.id ?? null;
  const subjectTeacherId =
    (
      await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE role = 'subject_teacher' ORDER BY created_at ASC LIMIT 1`,
      )
    ).rows[0]?.id ?? null;

  const refs = await ensureAcademicBaseline(tenantId, classTeacherId, subjectTeacherId);
  await seedSampleStudents(tenantId, refs);

  await pool.end();

  try {
    const platformAdmin = await seedPlatformAdmin();
    printPlatformAdminBanner(platformAdmin);
    console.log(`Platform super-admin ready: ${platformAdmin.email}`);
  } finally {
    await platformPool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
