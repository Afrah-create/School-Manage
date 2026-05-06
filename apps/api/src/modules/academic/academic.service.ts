import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import * as sharedSchemas from "@uganda-cbc-sms/shared";
import type { z } from "zod";

const schemas = (sharedSchemas as Record<string, unknown>).default
  ? ((sharedSchemas as Record<string, unknown>).default as Record<string, unknown>)
  : (sharedSchemas as Record<string, unknown>);

const {
  academicYearSchema,
  termSchema,
  classSchema,
  subjectSchema,
  classSubjectSchema,
  classSubjectBulkSchema,
  updateClassSubjectSchema,
  combinationSchema,
  updateCombinationSchema,
  combinationSubjectSchema,
  cbcStrandSchema,
  updateCbcStrandSchema,
  cbcSubStrandSchema,
  updateCbcSubStrandSchema,
  updateAcademicYearSchema,
  updateTermSchema,
  updateClassSchema,
  updateSubjectSchema,
} = schemas as {
  academicYearSchema: z.ZodTypeAny;
  termSchema: z.ZodTypeAny;
  classSchema: z.ZodTypeAny;
  subjectSchema: z.ZodTypeAny;
  classSubjectSchema: z.ZodTypeAny;
  classSubjectBulkSchema: z.ZodTypeAny;
  updateClassSubjectSchema: z.ZodTypeAny;
  combinationSchema: z.ZodTypeAny;
  updateCombinationSchema: z.ZodTypeAny;
  combinationSubjectSchema: z.ZodTypeAny;
  cbcStrandSchema: z.ZodTypeAny;
  updateCbcStrandSchema: z.ZodTypeAny;
  cbcSubStrandSchema: z.ZodTypeAny;
  updateCbcSubStrandSchema: z.ZodTypeAny;
  updateAcademicYearSchema: z.ZodTypeAny;
  updateTermSchema: z.ZodTypeAny;
  updateClassSchema: z.ZodTypeAny;
  updateSubjectSchema: z.ZodTypeAny;
};

type YearIn = z.infer<typeof academicYearSchema>;
type TermIn = z.infer<typeof termSchema>;
type ClassIn = z.infer<typeof classSchema>;
type SubjectIn = z.infer<typeof subjectSchema>;
type ClassSubjectIn = z.infer<typeof classSubjectSchema>;
type ClassSubjectBulkIn = z.infer<typeof classSubjectBulkSchema>;
type ClassSubjectUpdateIn = z.infer<typeof updateClassSubjectSchema>;
type ComboIn = z.infer<typeof combinationSchema>;
type ComboUpdateIn = z.infer<typeof updateCombinationSchema>;
type CombinationSubjectIn = z.infer<typeof combinationSubjectSchema>;
type CbcStrandIn = z.infer<typeof cbcStrandSchema>;
type CbcStrandUpdateIn = z.infer<typeof updateCbcStrandSchema>;
type CbcSubStrandIn = z.infer<typeof cbcSubStrandSchema>;
type CbcSubStrandUpdateIn = z.infer<typeof updateCbcSubStrandSchema>;
type YearUpdateIn = z.infer<typeof updateAcademicYearSchema>;
type TermUpdateIn = z.infer<typeof updateTermSchema>;
type ClassUpdateIn = z.infer<typeof updateClassSchema>;
type SubjectUpdateIn = z.infer<typeof updateSubjectSchema>;

function conflictDeleteMessage(entity: string): string {
  return `Cannot delete ${entity} because it is referenced by other records`;
}

function mapYear(r: {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}) {
  return {
    id: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    isActive: r.is_active,
  };
}

function mapTerm(r: {
  id: string;
  academic_year_id: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}) {
  return {
    id: r.id,
    academicYearId: r.academic_year_id,
    termNumber: r.term_number,
    startDate: r.start_date,
    endDate: r.end_date,
    isActive: r.is_active,
  };
}

function mapClass(r: {
  id: string;
  name: string;
  stream: string;
  level: string;
  academic_year_id: string;
  class_teacher_id: string | null;
}) {
  return {
    id: r.id,
    name: r.name,
    stream: r.stream,
    level: r.level,
    academicYearId: r.academic_year_id,
    classTeacherId: r.class_teacher_id,
  };
}

function mapSubject(r: { id: string; name: string; code: string; level: string }) {
  return { id: r.id, name: r.name, code: r.code, level: r.level };
}

function normalizeLevel(level: string): "O_LEVEL" | "A_LEVEL" {
  if (level === "o_level" || level === "O_LEVEL") return "O_LEVEL";
  return "A_LEVEL";
}

function slugCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6);
  return base.length > 0 ? base : "COMBO";
}

async function generateUniqueCombinationCode(name: string): Promise<string> {
  const base = slugCode(name);
  for (let i = 0; i < 1000; i += 1) {
    const candidate = i === 0 ? base : `${base}${String(i).padStart(2, "0")}`;
    const { rowCount } = await query(`SELECT 1 FROM subject_combinations WHERE code = $1 LIMIT 1`, [candidate]);
    if (!rowCount) return candidate;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}

export async function createAcademicYear(input: YearIn) {
  try {
    if (input.isActive) {
      await query(`UPDATE academic_years SET is_active = false`);
    }
    const { rows } = await query(
      `INSERT INTO academic_years (name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, COALESCE($4, false)) RETURNING *`,
      [input.name, input.startDate, input.endDate, input.isActive ?? false],
    );
    return mapYear(rows[0]! as never);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create academic year");
  }
}

export async function listAcademicYears() {
  try {
    const { rows } = await query(
      `SELECT * FROM academic_years ORDER BY start_date DESC`,
    );
    return (rows as never[]).map((r) => mapYear(r as never));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list years");
  }
}

export async function updateAcademicYear(id: string, input: YearUpdateIn) {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.startDate !== undefined) {
    sets.push(`start_date = $${i++}`);
    values.push(input.startDate);
  }
  if (input.endDate !== undefined) {
    sets.push(`end_date = $${i++}`);
    values.push(input.endDate);
  }
  if (input.isActive !== undefined) {
    if (input.isActive) await query(`UPDATE academic_years SET is_active = false`);
    sets.push(`is_active = $${i++}`);
    values.push(input.isActive);
  }
  values.push(id);
  const { rows } = await query(
    `UPDATE academic_years SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  if (!rows[0]) throw new HttpError(404, "Academic year not found");
  return mapYear(rows[0] as never);
}

export async function deleteAcademicYear(id: string) {
  try {
    const r = await query(`DELETE FROM academic_years WHERE id = $1`, [id]);
    if (r.rowCount === 0) throw new HttpError(404, "Academic year not found");
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23503") throw new HttpError(400, conflictDeleteMessage("academic year"));
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not delete academic year");
  }
}

export async function createTerm(input: TermIn) {
  try {
    if (input.isActive) {
      await query(`UPDATE terms SET is_active = false WHERE academic_year_id = $1`, [
        input.academicYearId,
      ]);
    }
    const { rows } = await query(
      `INSERT INTO terms (academic_year_id, term_number, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, COALESCE($5, false)) RETURNING *`,
      [
        input.academicYearId,
        input.termNumber,
        input.startDate,
        input.endDate,
        input.isActive ?? false,
      ],
    );
    return mapTerm(rows[0]! as never);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create term");
  }
}

export async function listTerms() {
  try {
    const { rows } = await query(`SELECT * FROM terms ORDER BY start_date`);
    return (rows as never[]).map((r) => mapTerm(r as never));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list terms");
  }
}

export async function updateTerm(id: string, input: TermUpdateIn) {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.academicYearId !== undefined) {
    sets.push(`academic_year_id = $${i++}`);
    values.push(input.academicYearId);
  }
  if (input.termNumber !== undefined) {
    sets.push(`term_number = $${i++}`);
    values.push(input.termNumber);
  }
  if (input.startDate !== undefined) {
    sets.push(`start_date = $${i++}`);
    values.push(input.startDate);
  }
  if (input.endDate !== undefined) {
    sets.push(`end_date = $${i++}`);
    values.push(input.endDate);
  }
  if (input.isActive !== undefined) {
    if (input.isActive) {
      const targetYearId =
        input.academicYearId ??
        (
          await query<{ academic_year_id: string }>(`SELECT academic_year_id FROM terms WHERE id = $1`, [id])
        ).rows[0]?.academic_year_id;
      if (targetYearId) {
        await query(`UPDATE terms SET is_active = false WHERE academic_year_id = $1`, [targetYearId]);
      }
    }
    sets.push(`is_active = $${i++}`);
    values.push(input.isActive);
  }
  values.push(id);
  const { rows } = await query(`UPDATE terms SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) throw new HttpError(404, "Term not found");
  return mapTerm(rows[0] as never);
}

export async function deleteTerm(id: string) {
  try {
    const r = await query(`DELETE FROM terms WHERE id = $1`, [id]);
    if (r.rowCount === 0) throw new HttpError(404, "Term not found");
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23503") throw new HttpError(400, conflictDeleteMessage("term"));
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not delete term");
  }
}

export async function createClass(input: ClassIn) {
  try {
    const { rows } = await query(
      `INSERT INTO classes (name, stream, level, academic_year_id, class_teacher_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.name, input.stream, normalizeLevel(input.level), input.academicYearId, input.classTeacherId ?? null],
    );
    return mapClass(rows[0]! as never);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create class");
  }
}

export async function listClasses() {
  try {
    const { rows } = await query(`SELECT * FROM classes ORDER BY name, stream`);
    return (rows as never[]).map((r) => mapClass(r as never));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list classes");
  }
}

export async function updateClass(id: string, input: ClassUpdateIn) {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.stream !== undefined) {
    sets.push(`stream = $${i++}`);
    values.push(input.stream);
  }
  if (input.level !== undefined) {
    sets.push(`level = $${i++}`);
    values.push(normalizeLevel(input.level));
  }
  if (input.academicYearId !== undefined) {
    sets.push(`academic_year_id = $${i++}`);
    values.push(input.academicYearId);
  }
  if (input.classTeacherId !== undefined) {
    sets.push(`class_teacher_id = $${i++}`);
    values.push(input.classTeacherId);
  }
  values.push(id);
  const { rows } = await query(`UPDATE classes SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) throw new HttpError(404, "Class not found");
  return mapClass(rows[0] as never);
}

export async function deleteClass(id: string) {
  try {
    const r = await query(`DELETE FROM classes WHERE id = $1`, [id]);
    if (r.rowCount === 0) throw new HttpError(404, "Class not found");
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23503") throw new HttpError(400, conflictDeleteMessage("class"));
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not delete class");
  }
}

export async function createSubject(input: SubjectIn) {
  try {
    const { rows } = await query(
      `INSERT INTO subjects (name, code, level) VALUES ($1, $2, $3) RETURNING *`,
      [input.name, input.code, normalizeLevel(input.level)],
    );
    return mapSubject(rows[0]! as never);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Subject code already exists");
    throw new Error(e instanceof Error ? e.message : "Could not create subject");
  }
}

export async function listSubjects() {
  try {
    const { rows } = await query(`SELECT * FROM subjects ORDER BY code`);
    return (rows as never[]).map((r) => mapSubject(r as never));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list subjects");
  }
}

export async function updateSubject(id: string, input: SubjectUpdateIn) {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.code !== undefined) {
    sets.push(`code = $${i++}`);
    values.push(input.code);
  }
  if (input.level !== undefined) {
    sets.push(`level = $${i++}`);
    values.push(normalizeLevel(input.level));
  }
  values.push(id);
  try {
    const { rows } = await query(
      `UPDATE subjects SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    if (!rows[0]) throw new HttpError(404, "Subject not found");
    return mapSubject(rows[0] as never);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Subject code already exists");
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not update subject");
  }
}

export async function deleteSubject(id: string) {
  try {
    const r = await query(`DELETE FROM subjects WHERE id = $1`, [id]);
    if (r.rowCount === 0) throw new HttpError(404, "Subject not found");
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23503") throw new HttpError(400, conflictDeleteMessage("subject"));
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not delete subject");
  }
}

export async function createClassSubject(input: ClassSubjectIn) {
  try {
    const { rows } = await query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id, academic_year_id, term_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.classId, input.subjectId, input.teacherId ?? null, input.academicYearId, input.termId ?? null],
    );
    return rows[0];
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Subject already assigned to class");
    throw new Error(e instanceof Error ? e.message : "Could not assign subject");
  }
}

export async function getClassSubjects(filters: { classId?: string; academicYearId?: string; teacherId?: string }) {
  const where: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (filters.classId) {
    where.push(`cs.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters.academicYearId) {
    where.push(`cs.academic_year_id = $${i++}`);
    values.push(filters.academicYearId);
  }
  if (filters.teacherId) {
    where.push(`cs.teacher_id = $${i++}`);
    values.push(filters.teacherId);
  }
  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT
      cs.*,
      c.name AS class_name,
      c.stream AS class_stream,
      s.name AS subject_name,
      s.code AS subject_code,
      y.name AS academic_year_name,
      t.term_number,
      u.full_name AS teacher_name
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     JOIN subjects s ON s.id = cs.subject_id
     JOIN academic_years y ON y.id = cs.academic_year_id
     LEFT JOIN terms t ON t.id = cs.term_id
     LEFT JOIN users u ON u.id = cs.teacher_id
     ${clause}
     ORDER BY c.name, c.stream, s.code`,
    values,
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x["id"]),
      classId: String(x["class_id"]),
      subjectId: String(x["subject_id"]),
      teacherId: x["teacher_id"] ? String(x["teacher_id"]) : null,
      academicYearId: String(x["academic_year_id"]),
      termId: x["term_id"] ? String(x["term_id"]) : null,
      className: String(x["class_name"]),
      classStream: String(x["class_stream"]),
      subjectName: String(x["subject_name"]),
      subjectCode: String(x["subject_code"]),
      academicYearName: String(x["academic_year_name"]),
      termNumber: (x["term_number"] as number | null) ?? null,
      teacherName: (x["teacher_name"] as string | null) ?? null,
    };
  });
}

export async function getClassSubjectById(id: string) {
  const { rows } = await query(
    `SELECT
      cs.*,
      c.name AS class_name,
      c.stream AS class_stream,
      s.name AS subject_name,
      s.code AS subject_code,
      y.name AS academic_year_name,
      t.term_number,
      u.full_name AS teacher_name
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     JOIN subjects s ON s.id = cs.subject_id
     JOIN academic_years y ON y.id = cs.academic_year_id
     LEFT JOIN terms t ON t.id = cs.term_id
     LEFT JOIN users u ON u.id = cs.teacher_id
     WHERE cs.id = $1`,
    [id],
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new HttpError(404, "Class subject assignment not found");
  return {
    id: String(row["id"]),
    classId: String(row["class_id"]),
    subjectId: String(row["subject_id"]),
    teacherId: row["teacher_id"] ? String(row["teacher_id"]) : null,
    academicYearId: String(row["academic_year_id"]),
    termId: row["term_id"] ? String(row["term_id"]) : null,
    className: String(row["class_name"]),
    classStream: String(row["class_stream"]),
    subjectName: String(row["subject_name"]),
    subjectCode: String(row["subject_code"]),
    academicYearName: String(row["academic_year_name"]),
    termNumber: (row["term_number"] as number | null) ?? null,
    teacherName: (row["teacher_name"] as string | null) ?? null,
  };
}

export async function updateClassSubject(id: string, input: ClassSubjectUpdateIn) {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.teacherId !== undefined) {
    sets.push(`teacher_id = $${i++}`);
    values.push(input.teacherId);
  }
  if (input.termId !== undefined) {
    sets.push(`term_id = $${i++}`);
    values.push(input.termId);
  }
  sets.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await query(
    `UPDATE class_subjects SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  if (!rows[0]) throw new HttpError(404, "Class subject assignment not found");
  return getClassSubjectById(id);
}

export async function deleteClassSubject(id: string) {
  const r = await query(`DELETE FROM class_subjects WHERE id = $1`, [id]);
  if (r.rowCount === 0) throw new HttpError(404, "Class subject assignment not found");
}

export type BulkUpdatedClassSubject = { id: string; teacherId: string | null };

export async function bulkAssignTeacher(
  teacherId: string | null,
  classSubjectIds: string[],
): Promise<BulkUpdatedClassSubject[]> {
  const { rows } = await query(
    `UPDATE class_subjects
     SET teacher_id = $1, updated_at = NOW()
     WHERE id = ANY($2::uuid[])
     RETURNING id, teacher_id`,
    [teacherId, classSubjectIds],
  );
  return rows.map((r) => {
    const x = r as { id: string; teacher_id: string | null };
    return { id: String(x.id), teacherId: x.teacher_id ? String(x.teacher_id) : null };
  });
}

export type TeacherAssignmentRow = {
  classSubjectId: string;
  className: string;
  classStream: string;
  subjectName: string;
  termName: string | null;
  academicYear: string;
};

export async function getTeacherAssignments(
  teacherId: string,
  academicYearId: string,
): Promise<TeacherAssignmentRow[]> {
  const { rows } = await query(
    `SELECT
       cs.id AS class_subject_id,
       c.name AS class_name,
       c.stream AS class_stream,
       s.name AS subject_name,
       CASE WHEN t.id IS NULL THEN NULL ELSE ('Term ' || t.term_number::text) END AS term_name,
       ay.name AS academic_year
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN terms t ON t.id = cs.term_id
     JOIN academic_years ay ON ay.id = cs.academic_year_id
     WHERE cs.teacher_id = $1
       AND cs.academic_year_id = $2
     ORDER BY c.name, c.stream, s.name`,
    [teacherId, academicYearId],
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      classSubjectId: String(x["class_subject_id"]),
      className: String(x["class_name"]),
      classStream: String(x["class_stream"]),
      subjectName: String(x["subject_name"]),
      termName: x["term_name"] != null ? String(x["term_name"]) : null,
      academicYear: String(x["academic_year"]),
    };
  });
}

export async function getTeacherAssignmentCount(teacherId: string, academicYearId: string): Promise<number> {
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count
     FROM class_subjects
     WHERE teacher_id = $1
       AND academic_year_id = $2`,
    [teacherId, academicYearId],
  );
  const row = rows[0] as { count: string } | undefined;
  return Number(row?.count ?? 0);
}

export type UnassignedClassSubjectRow = {
  id: string;
  className: string;
  classStream: string;
  subjectName: string;
  termName: string | null;
};

export async function getUnassignedClassSubjects(academicYearId: string): Promise<UnassignedClassSubjectRow[]> {
  const { rows } = await query(
    `SELECT
       cs.id,
       c.name AS class_name,
       c.stream AS class_stream,
       s.name AS subject_name,
       CASE WHEN t.id IS NULL THEN NULL ELSE ('Term ' || t.term_number::text) END AS term_name
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN terms t ON t.id = cs.term_id
     WHERE cs.teacher_id IS NULL
       AND cs.academic_year_id = $1
     ORDER BY c.name, c.stream, s.name`,
    [academicYearId],
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x["id"]),
      className: String(x["class_name"]),
      classStream: String(x["class_stream"]),
      subjectName: String(x["subject_name"]),
      termName: x["term_name"] != null ? String(x["term_name"]) : null,
    };
  });
}

export async function bulkAssignSubjectsToClass(input: ClassSubjectBulkIn) {
  const values = input.subjectIds
    .map((_: string, idx: number) => `($1, $${idx + 4}, $2, $3, NOW(), NOW())`)
    .join(", ");
  await query(
    `INSERT INTO class_subjects (class_id, subject_id, academic_year_id, term_id, created_at, updated_at)
     VALUES ${values}
     ON CONFLICT (class_id, subject_id, academic_year_id)
     DO UPDATE SET term_id = EXCLUDED.term_id, updated_at = NOW()`,
    [input.classId, input.academicYearId, input.termId ?? null, ...input.subjectIds],
  );
  return getClassSubjects({ classId: input.classId, academicYearId: input.academicYearId });
}

export async function createCombination(input: ComboIn) {
  try {
    const code = input.code?.trim()
      ? input.code.trim().toUpperCase()
      : await generateUniqueCombinationCode(input.name);
    const { rows } = await query(
      `INSERT INTO subject_combinations (code, name, level, description, subjects, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW()) RETURNING *`,
      [code, input.name, normalizeLevel(input.level), input.description ?? null, JSON.stringify(input.subjects ?? [])],
    );
    const combo = rows[0] as { id: string };
    for (const subjectId of input.subjects) {
      await query(
        `INSERT INTO combination_subjects (combination_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [combo.id, subjectId],
      );
    }
    return getCombinationById(combo.id);
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create combination");
  }
}

export async function getCombinations(filters: { level?: string }) {
  const values: unknown[] = [];
  const where = filters.level ? `WHERE sc.level = $1` : "";
  if (filters.level) values.push(normalizeLevel(filters.level));
  const { rows } = await query(
    `SELECT
      sc.id,
      sc.code,
      sc.name,
      sc.level,
      sc.description,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('id', s.id, 'name', s.name, 'code', s.code, 'level', s.level)
          ORDER BY s.code
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::jsonb
      ) AS subjects
     FROM subject_combinations sc
     LEFT JOIN combination_subjects cs ON cs.combination_id = sc.id
     LEFT JOIN subjects s ON s.id = cs.subject_id
     ${where}
     GROUP BY sc.id
     ORDER BY sc.code`,
    values,
  );
  return rows;
}

export async function listCombinations() {
  return getCombinations({});
}

export async function getCombinationById(id: string) {
  const { rows } = await query(
    `SELECT
      sc.id,
      sc.code,
      sc.name,
      sc.level,
      sc.description,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('id', s.id, 'name', s.name, 'code', s.code, 'level', s.level)
          ORDER BY s.code
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::jsonb
      ) AS subjects
     FROM subject_combinations sc
     LEFT JOIN combination_subjects cs ON cs.combination_id = sc.id
     LEFT JOIN subjects s ON s.id = cs.subject_id
     WHERE sc.id = $1
     GROUP BY sc.id`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "Combination not found");
  return rows[0];
}

export async function updateCombination(id: string, input: ComboUpdateIn) {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.code !== undefined) {
    sets.push(`code = $${i++}`);
    values.push(input.code.toUpperCase());
  }
  if (input.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.level !== undefined) {
    sets.push(`level = $${i++}`);
    values.push(normalizeLevel(input.level));
  }
  if (input.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(input.description);
  }
  sets.push(`updated_at = NOW()`);
  values.push(id);
  const { rowCount } = await query(
    `UPDATE subject_combinations SET ${sets.join(", ")} WHERE id = $${i}`,
    values,
  );
  if (!rowCount) throw new HttpError(404, "Combination not found");
  return getCombinationById(id);
}

export async function deleteCombination(id: string) {
  const r = await query(`DELETE FROM subject_combinations WHERE id = $1`, [id]);
  if (r.rowCount === 0) throw new HttpError(404, "Combination not found");
}

export async function addSubjectToCombination(combinationId: string, input: CombinationSubjectIn) {
  await query(
    `INSERT INTO combination_subjects (combination_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [combinationId, input.subjectId],
  );
  return getCombinationById(combinationId);
}

export async function removeSubjectFromCombination(combinationId: string, subjectId: string) {
  await query(`DELETE FROM combination_subjects WHERE combination_id = $1 AND subject_id = $2`, [
    combinationId,
    subjectId,
  ]);
  return getCombinationById(combinationId);
}

export async function createCbcStrand(input: CbcStrandIn) {
  try {
    const { rows } = await query(
      `INSERT INTO cbc_strands (subject_id, name, code, description, updated_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [input.subjectId, input.name, input.code.toUpperCase(), input.description ?? null],
    );
    return rows[0];
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not create strand");
  }
}

export async function getStrands(filters: { subjectId?: string }) {
  const values: unknown[] = [];
  const where = filters.subjectId ? `WHERE st.subject_id = $1` : "";
  if (filters.subjectId) values.push(filters.subjectId);
  const { rows } = await query(
    `SELECT
      st.id,
      st.subject_id AS "subjectId",
      st.name,
      st.code,
      st.description,
      s.name AS "subjectName",
      COUNT(ss.id)::int AS "subStrandsCount"
     FROM cbc_strands st
     LEFT JOIN subjects s ON s.id = st.subject_id
     LEFT JOIN cbc_sub_strands ss ON ss.strand_id = st.id
     ${where}
     GROUP BY st.id, s.name
     ORDER BY st.name`,
    values,
  );
  return rows;
}

export async function listCbcStrands(subjectId?: string) {
  return getStrands({ subjectId });
}

export async function getStrandById(id: string) {
  const { rows } = await query(
    `SELECT
      st.id,
      st.subject_id AS "subjectId",
      st.name,
      st.code,
      st.description,
      s.name AS "subjectName",
      COALESCE(
        jsonb_agg(
          jsonb_build_object('id', ss.id, 'name', ss.name, 'code', ss.code, 'description', ss.description)
          ORDER BY ss.name
        ) FILTER (WHERE ss.id IS NOT NULL),
        '[]'::jsonb
      ) AS "subStrands"
     FROM cbc_strands st
     LEFT JOIN subjects s ON s.id = st.subject_id
     LEFT JOIN cbc_sub_strands ss ON ss.strand_id = st.id
     WHERE st.id = $1
     GROUP BY st.id, s.name`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "CBC strand not found");
  return rows[0];
}

export async function updateStrand(id: string, input: CbcStrandUpdateIn) {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.subjectId !== undefined) {
    sets.push(`subject_id = $${i++}`);
    values.push(input.subjectId);
  }
  if (input.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.code !== undefined) {
    sets.push(`code = $${i++}`);
    values.push(input.code.toUpperCase());
  }
  if (input.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(input.description);
  }
  sets.push(`updated_at = NOW()`);
  values.push(id);
  const { rowCount } = await query(`UPDATE cbc_strands SET ${sets.join(", ")} WHERE id = $${i}`, values);
  if (!rowCount) throw new HttpError(404, "CBC strand not found");
  return getStrandById(id);
}

export async function deleteStrand(id: string) {
  const r = await query(`DELETE FROM cbc_strands WHERE id = $1`, [id]);
  if (r.rowCount === 0) throw new HttpError(404, "CBC strand not found");
}

export async function createSubStrand(strandId: string, input: CbcSubStrandIn) {
  const { rows } = await query(
    `INSERT INTO cbc_sub_strands (strand_id, name, code, description, updated_at)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
    [strandId, input.name, input.code.toUpperCase(), input.description ?? null],
  );
  return rows[0];
}

export async function updateSubStrand(id: string, input: CbcSubStrandUpdateIn) {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.code !== undefined) {
    sets.push(`code = $${i++}`);
    values.push(input.code.toUpperCase());
  }
  if (input.description !== undefined) {
    sets.push(`description = $${i++}`);
    values.push(input.description);
  }
  sets.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await query(
    `UPDATE cbc_sub_strands SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  if (!rows[0]) throw new HttpError(404, "CBC sub-strand not found");
  return rows[0];
}

export async function deleteSubStrand(id: string) {
  const r = await query(`DELETE FROM cbc_sub_strands WHERE id = $1`, [id]);
  if (r.rowCount === 0) throw new HttpError(404, "CBC sub-strand not found");
}
