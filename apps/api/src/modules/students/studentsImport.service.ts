import type { CreateStudentInput, StudentImportResult, STUDENT_IMPORT_CSV_HEADERS } from "@uganda-cbc-sms/shared";
import { createStudentSchema, genderSchema } from "@uganda-cbc-sms/shared";
import type { PoolClient } from "pg";
import { query, withTransaction } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { nextSequence, padNumber } from "../../utils/sequences";

const HEADERS = [
  "fullName",
  "dateOfBirth",
  "gender",
  "className",
  "classStream",
  "guardianName",
  "guardianContact",
  "guardianEmail",
  "address",
  "previousSchool",
] as const satisfies readonly (typeof STUDENT_IMPORT_CSV_HEADERS)[number][];

export function studentImportTemplateCsv(): string {
  const header = HEADERS.join(",");
  const example =
    "Jane Doe,2010-05-15,female,S1,Main,John Doe,+256700000000,jane.parent@example.com,Kampala,Previous Primary School";
  return `${header}\n${example}\n`;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0]!.split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

async function resolveInvoiceTerm(client: Pick<PoolClient, "query">): Promise<string | null> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM terms WHERE is_active = true LIMIT 1`,
  );
  if (rows[0]) return rows[0].id;
  const r2 = await client.query<{ id: string }>(`SELECT id FROM terms ORDER BY end_date DESC LIMIT 1`);
  return r2.rows[0]?.id ?? null;
}

async function createStudentInTransaction(client: PoolClient, input: CreateStudentInput) {
  const year = new Date().getFullYear();
  const n = await nextSequence(client, `student_${year}`);
  const studentNumber = `SMS-${year}-${padNumber(n, 5)}`;
  const { rows } = await client.query(
    `INSERT INTO students (
      student_number, full_name, date_of_birth, gender, guardian_name, guardian_contact,
      class_id, combination_id, guardian_email, address, previous_school
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      studentNumber,
      input.fullName,
      input.dateOfBirth,
      input.gender,
      input.guardianName,
      input.guardianContact,
      input.classId,
      input.combinationId ?? null,
      input.guardianEmail ?? null,
      input.address ?? null,
      input.previousSchool ?? null,
    ],
  );
  const studentId = String(rows[0]!.id);
  const termId = await resolveInvoiceTerm(client);
  if (termId && input.classId) {
    const sum = await client.query<{ tot: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS tot FROM fee_structures WHERE class_id = $1::uuid AND term_id = $2::uuid`,
      [input.classId, termId],
    );
    const total = sum.rows[0]?.tot ?? "0";
    if (Number(total) > 0) {
      await client.query(
        `INSERT INTO fee_invoices (student_id, term_id, total_amount, amount_paid)
         VALUES ($1::uuid, $2::uuid, $3::numeric, 0)
         ON CONFLICT DO NOTHING`,
        [studentId, termId, total],
      );
    }
  }
  return studentId;
}

async function resolveClassId(className: string, classStream: string, academicYearId: string): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM classes
     WHERE academic_year_id = $1::uuid AND name = $2::varchar AND stream = $3::varchar
     LIMIT 1`,
    [academicYearId, className, classStream],
  );
  return rows[0]?.id ?? null;
}

async function resolveActiveYearId(): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM academic_years WHERE is_active = true ORDER BY start_date DESC LIMIT 1`,
  );
  if (!rows[0]) throw new HttpError(400, "No active academic year. Create or activate a year first.");
  return rows[0].id;
}

export async function importStudentsFromCsv(csvText: string): Promise<StudentImportResult> {
  const parsed = parseCsv(csvText);
  if (!parsed.length) {
    throw new HttpError(400, "CSV file is empty or missing data rows.");
  }

  const academicYearId = await resolveActiveYearId();
  const result: StudentImportResult = {
    created: 0,
    skipped: 0,
    errors: [],
    createdStudentIds: [],
  };

  await withTransaction(async (client) => {
    for (let i = 0; i < parsed.length; i += 1) {
      const rowNum = i + 2;
      const raw = parsed[i]!;
      try {
        const classId = await resolveClassId(raw.className ?? "", raw.classStream ?? "", academicYearId);
        if (!classId) {
          result.errors.push({
            row: rowNum,
            field: "className",
            message: `Class ${raw.className ?? ""} ${raw.classStream ?? ""} not found in active year`,
          });
          result.skipped += 1;
          continue;
        }

        const genderParsed = genderSchema.safeParse((raw.gender ?? "").toLowerCase());
        if (!genderParsed.success) {
          result.errors.push({ row: rowNum, field: "gender", message: "Must be male or female" });
          result.skipped += 1;
          continue;
        }

        const payload = {
          fullName: raw.fullName ?? "",
          dateOfBirth: raw.dateOfBirth ?? "",
          gender: genderParsed.data,
          guardianName: raw.guardianName ?? "",
          guardianContact: raw.guardianContact ?? "",
          classId,
          guardianEmail: raw.guardianEmail || null,
          address: raw.address || null,
          previousSchool: raw.previousSchool || null,
          combinationId: null,
        };

        const validated = createStudentSchema.safeParse(payload);
        if (!validated.success) {
          const issue = validated.error.issues[0];
          result.errors.push({
            row: rowNum,
            field: issue?.path.join(".") || "row",
            message: issue?.message ?? "Validation failed",
          });
          result.skipped += 1;
          continue;
        }

        const studentId = await createStudentInTransaction(client, validated.data);
        result.createdStudentIds.push(studentId);
        result.created += 1;
      } catch (e) {
        result.errors.push({
          row: rowNum,
          field: "row",
          message: e instanceof Error ? e.message : "Could not enrol row",
        });
        result.skipped += 1;
      }
    }
  });

  return result;
}

export function errorsToCsv(errors: StudentImportResult["errors"]): string {
  const lines = ["row,field,message", ...errors.map((e) => `${e.row},${e.field},"${e.message.replace(/"/g, '""')}"`)];
  return `${lines.join("\n")}\n`;
}
