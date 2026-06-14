import type { CreateStudentInput, StudentImportResult, STUDENT_IMPORT_CSV_HEADERS } from "@uganda-cbc-sms/shared";
import { createStudentSchema, genderSchema } from "@uganda-cbc-sms/shared";
import type { PoolClient } from "pg";
import { query, withTransaction } from "../../config/db";
import { formatDateOnly } from "../../utils/dateOnly";
import { HttpError } from "../../utils/httpError";
import { nextSequence, padNumber } from "../../utils/sequences";

type ImportField = (typeof STUDENT_IMPORT_CSV_HEADERS)[number];

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
] as const satisfies readonly ImportField[];

/** Maps common spreadsheet header labels to canonical import fields. */
const HEADER_ALIASES: Record<string, ImportField> = {
  fullname: "fullName",
  "full name": "fullName",
  name: "fullName",
  studentname: "fullName",
  "student name": "fullName",
  learnername: "fullName",
  "learner name": "fullName",
  dateofbirth: "dateOfBirth",
  "date of birth": "dateOfBirth",
  dob: "dateOfBirth",
  birthdate: "dateOfBirth",
  "birth date": "dateOfBirth",
  gender: "gender",
  sex: "gender",
  classname: "className",
  "class name": "className",
  class: "className",
  form: "className",
  grade: "className",
  classstream: "classStream",
  "class stream": "classStream",
  stream: "classStream",
  section: "classStream",
  guardianname: "guardianName",
  "guardian name": "guardianName",
  parentname: "guardianName",
  "parent name": "guardianName",
  "parent/guardian": "guardianName",
  guardiancontact: "guardianContact",
  "guardian contact": "guardianContact",
  parentcontact: "guardianContact",
  "parent contact": "guardianContact",
  phone: "guardianContact",
  "phone number": "guardianContact",
  contact: "guardianContact",
  mobileno: "guardianContact",
  "mobile no": "guardianContact",
  guardianemail: "guardianEmail",
  "guardian email": "guardianEmail",
  parentemail: "guardianEmail",
  "parent email": "guardianEmail",
  email: "guardianEmail",
  address: "address",
  homeaddress: "address",
  "home address": "address",
  previousschool: "previousSchool",
  "previous school": "previousSchool",
  lastschool: "previousSchool",
  "last school": "previousSchool",
};

export function studentImportTemplateCsv(): string {
  const header = HEADERS.join(",");
  const example =
    "Jane Doe,2010-05-15,female,S1,Main,John Doe,+256700000000,jane.parent@example.com,Kampala,Previous Primary School";
  return `${header}\n${example}\n`;
}

function headerKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizeHeader(raw: string): ImportField | null {
  const trimmed = raw.trim();
  if ((HEADERS as readonly string[]).includes(trimmed)) return trimmed as ImportField;
  return HEADER_ALIASES[headerKey(trimmed)] ?? null;
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  let comma = 0;
  let semi = 0;
  let tab = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i += 1) {
    const ch = headerLine[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === ",") comma += 1;
      else if (ch === ";") semi += 1;
      else if (ch === "\t") tab += 1;
    }
  }
  if (tab >= comma && tab >= semi && tab > 0) return "\t";
  if (semi > comma) return ";";
  return ",";
}

/** Parse full CSV text into records (supports quoted fields spanning multiple lines). */
function parseCsvRecords(text: string, delimiter: string): string[][] {
  const content = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = "";
  };

  const pushRow = () => {
    if (row.some((c) => c.length > 0)) records.push(row);
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      pushField();
      continue;
    }
    if (ch === "\r") {
      if (content[i + 1] === "\n") i += 1;
      pushField();
      pushRow();
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  return records;
}

type ParsedImportRow = Partial<Record<ImportField, string>>;

type ParsedImportEntry = { row: ParsedImportRow; sourceRow: number };

function isBlankRow(row: ParsedImportRow): boolean {
  return !Object.values(row).some((v) => v?.trim());
}

function normalizeDateOfBirth(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const serial = Math.floor(Number(s));
    if (serial > 0 && serial < 120_000) {
      const utc = Date.UTC(1899, 11, 30) + serial * 86_400_000;
      const formatted = formatDateOnly(new Date(utc));
      if (formatted) return formatted;
    }
  }

  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    const y = dmy[3]!;
    let day: number;
    let month: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      day = a;
      month = b;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const ymd = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2]!.padStart(2, "0")}-${ymd[3]!.padStart(2, "0")}`;
  }

  const fromText = formatDateOnly(s);
  return fromText || null;
}

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}

function parseCsv(text: string): ParsedImportEntry[] {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return [];

  const firstLineEnd = trimmed.search(/\r?\n/);
  const headerLine = firstLineEnd === -1 ? trimmed : trimmed.slice(0, firstLineEnd);
  const delimiter = detectDelimiter(headerLine);
  const records = parseCsvRecords(trimmed, delimiter);
  if (records.length < 2) return [];

  const rawHeaders = records[0]!;
  const fieldByIndex = rawHeaders.map((h) => normalizeHeader(h));

  const required = new Set<ImportField>(["fullName", "dateOfBirth", "gender", "guardianName", "guardianContact"]);
  const mapped = new Set(fieldByIndex.filter(Boolean));
  const hasClass = mapped.has("className") || mapped.has("classStream");
  if (!mapped.has("fullName")) {
    throw new HttpError(
      400,
      `Could not find a student name column. Use a header like fullName, "Full Name", or name. Found: ${rawHeaders.join(", ")}`,
    );
  }
  if (!hasClass) {
    throw new HttpError(
      400,
      `Could not find a class column. Use className/classStream, "Class Name"/Stream, or class/stream. Found: ${rawHeaders.join(", ")}`,
    );
  }
  for (const req of required) {
    if (!mapped.has(req)) {
      throw new HttpError(
        400,
        `Missing required column for ${req}. Expected headers like: ${HEADERS.join(", ")}. Found: ${rawHeaders.join(", ")}`,
      );
    }
  }

  const rows: ParsedImportEntry[] = [];
  for (let i = 1; i < records.length; i += 1) {
    const cols = records[i]!;
    const row: ParsedImportRow = {};
    fieldByIndex.forEach((field, idx) => {
      if (!field) return;
      const value = cols[idx] ?? "";
      if (value) row[field] = value;
    });
    if (!isBlankRow(row)) rows.push({ row, sourceRow: i + 1 });
  }
  return rows;
}

function splitClassAndStream(className: string, classStream: string): { name: string; stream: string } {
  const stream = classStream.trim();
  let name = className.trim();
  if (name && stream) return { name, stream };
  if (!name) return { name: "", stream };

  const dash = name.match(/^(.+?)\s[-–/]\s(.+)$/);
  if (dash) return { name: dash[1]!.trim(), stream: dash[2]!.trim() };

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { name: parts[0]!, stream: parts.slice(1).join(" ") };
  }
  return { name, stream };
}

function normalizeGender(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === "m" || v === "male" || v === "boy") return "male";
  if (v === "f" || v === "female" || v === "girl") return "female";
  return v;
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

async function matchClass(
  name: string,
  stream: string,
  academicYearId: string,
): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM classes
     WHERE academic_year_id = $1::uuid
       AND lower(trim(name)) = lower(trim($2))
       AND lower(trim(stream)) = lower(trim($3))
     LIMIT 1`,
    [academicYearId, name, stream],
  );
  return rows[0]?.id ?? null;
}

async function resolveClassId(
  className: string,
  classStream: string,
  academicYearId: string,
): Promise<string | null> {
  const { name, stream } = splitClassAndStream(className, classStream);
  if (!name) return null;

  let id = await matchClass(name, stream, academicYearId);
  if (id) return id;

  if (!stream) {
    id = await matchClass(name, "Main", academicYearId);
    if (id) return id;

    const { rows } = await query<{ id: string; stream: string }>(
      `SELECT id, stream FROM classes
       WHERE academic_year_id = $1::uuid AND lower(trim(name)) = lower(trim($2))`,
      [academicYearId, name],
    );
    if (rows.length === 1) return rows[0]!.id;
  }

  return null;
}

async function listClassesForYear(academicYearId: string): Promise<string[]> {
  const { rows } = await query<{ name: string; stream: string }>(
    `SELECT name, stream FROM classes WHERE academic_year_id = $1::uuid ORDER BY name, stream`,
    [academicYearId],
  );
  return rows.map((r) => `${r.name} / ${r.stream}`);
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
  const knownClasses = await listClassesForYear(academicYearId);
  const result: StudentImportResult = {
    created: 0,
    skipped: 0,
    totalRows: parsed.length,
    errors: [],
    createdStudentIds: [],
  };

  await withTransaction(async (client) => {
    for (let i = 0; i < parsed.length; i += 1) {
      const { row: raw, sourceRow: rowNum } = parsed[i]!;
      const savepoint = `import_row_${i}`;
      try {
        const { name: classLabel, stream: streamLabel } = splitClassAndStream(
          raw.className ?? "",
          raw.classStream ?? "",
        );
        if (!classLabel) {
          result.errors.push({
            row: rowNum,
            field: "className",
            message: "Class name is empty. Add className (or Class) and classStream (or Stream) columns.",
          });
          result.skipped += 1;
          continue;
        }

        const classId = await resolveClassId(raw.className ?? "", raw.classStream ?? "", academicYearId);
        if (!classId) {
          const hint =
            knownClasses.length > 0
              ? ` Available in active year: ${knownClasses.slice(0, 8).join("; ")}${knownClasses.length > 8 ? "…" : ""}.`
              : " No classes exist for the active year — create classes first.";
          result.errors.push({
            row: rowNum,
            field: "className",
            message: `Class "${classLabel}" / stream "${streamLabel || "(none)"}" not found in active year.${hint}`,
          });
          result.skipped += 1;
          continue;
        }

        const genderParsed = genderSchema.safeParse(normalizeGender(raw.gender ?? ""));
        if (!genderParsed.success) {
          result.errors.push({ row: rowNum, field: "gender", message: "Must be male or female (M/F accepted)" });
          result.skipped += 1;
          continue;
        }

        const dateOfBirth = normalizeDateOfBirth(raw.dateOfBirth ?? "");
        if (!dateOfBirth) {
          result.errors.push({
            row: rowNum,
            field: "dateOfBirth",
            message: 'Use a date like 2010-05-15 or 15/05/2010 (Excel dates are accepted).',
          });
          result.skipped += 1;
          continue;
        }

        const guardianContact = normalizePhone(raw.guardianContact ?? "");
        const payload = {
          fullName: (raw.fullName ?? "").trim(),
          dateOfBirth,
          gender: genderParsed.data,
          guardianName: (raw.guardianName ?? "").trim(),
          guardianContact,
          classId,
          guardianEmail: raw.guardianEmail?.trim() || null,
          address: raw.address?.trim() || null,
          previousSchool: raw.previousSchool?.trim() || null,
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

        await client.query(`SAVEPOINT ${savepoint}`);
        try {
          const studentId = await createStudentInTransaction(client, validated.data);
          await client.query(`RELEASE SAVEPOINT ${savepoint}`);
          result.createdStudentIds.push(studentId);
          result.created += 1;
        } catch (dbErr) {
          await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          result.errors.push({
            row: rowNum,
            field: "row",
            message: dbErr instanceof Error ? dbErr.message : "Could not save student row",
          });
          result.skipped += 1;
        }
      } catch (e) {
        try {
          await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        } catch {
          /* savepoint may not exist yet */
        }
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
