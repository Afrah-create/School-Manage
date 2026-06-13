import { getRequestDbClient, query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { syncHomeroomOnClass } from "../../utils/classTeacherAssignments";
import { teacherEligibilitySql } from "../../utils/teacherTeachingAccess";
import { validateGradingScaleRows } from "../../utils/gradingScales";
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
  upsertGradingScaleSchema,
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
  upsertGradingScaleSchema: z.ZodTypeAny;
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
type GradingScaleUpsertIn = z.infer<typeof upsertGradingScaleSchema>;

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
  curriculum_track?: string | null;
}) {
  return {
    id: r.id,
    name: r.name,
    stream: r.stream,
    level: r.level,
    academicYearId: r.academic_year_id,
    classTeacherId: r.class_teacher_id,
    curriculumTrack: (r.curriculum_track as "SCIENCES" | "ARTS" | "GENERAL" | null | undefined) ?? null,
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

export type AcademicStructureSummary = {
  years: number;
  terms: number;
  classes: number;
  subjects: number;
  classSubjects: number;
  combinations: number;
  cbcStrands: number;
  gradingScales: number;
};

export async function academicStructureSummary(): Promise<AcademicStructureSummary> {
  try {
    const [y, t, c, s, cs, k, st, gs] = await Promise.all([
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM academic_years`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM terms`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM classes`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM subjects`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM class_subjects`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM subject_combinations`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM cbc_strands`),
      query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM assessment_grading_scales`),
    ]);
    const num = (row: { c: string } | undefined) => Number(row?.c ?? "0");
    return {
      years: num(y.rows[0]),
      terms: num(t.rows[0]),
      classes: num(c.rows[0]),
      subjects: num(s.rows[0]),
      classSubjects: num(cs.rows[0]),
      combinations: num(k.rows[0]),
      cbcStrands: num(st.rows[0]),
      gradingScales: num(gs.rows[0]),
    };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not load academic summary");
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
    const created = mapClass(rows[0]! as never);
    if (input.classTeacherId) {
      await setClassTeacherAssignments(created.id, {
        academicYearId: input.academicYearId,
        teachers: [{ teacherId: input.classTeacherId, isHomeroom: true }],
      });
    }
    return created;
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
  if (input.curriculumTrack !== undefined) {
    sets.push(`curriculum_track = $${i++}`);
    values.push(input.curriculumTrack);
  }
  values.push(id);
  const { rows } = await query(`UPDATE classes SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, values);
  if (!rows[0]) throw new HttpError(404, "Class not found");
  const updated = mapClass(rows[0] as never);
  if (input.classTeacherId !== undefined) {
    const yearId = input.academicYearId ?? updated.academicYearId;
    if (input.classTeacherId) {
      const existing = await listClassTeacherAssignments({ classId: id, academicYearId: yearId });
      const others = existing
        .filter((a) => a.teacherId !== input.classTeacherId)
        .map((a) => ({ teacherId: a.teacherId, isHomeroom: false }));
      await setClassTeacherAssignments(id, {
        academicYearId: yearId,
        teachers: [{ teacherId: input.classTeacherId, isHomeroom: true }, ...others],
      });
    } else {
      await syncHomeroomOnClass(id, yearId);
    }
  }
  return updated;
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
  if (teacherId) {
    await assertTeacherCanTeachClassSubjects(teacherId, classSubjectIds);
  }
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
  filters?: { classId?: string; level?: string },
): Promise<TeacherAssignmentRow[]> {
  const values: unknown[] = [teacherId, academicYearId];
  const where: string[] = ["cs.teacher_id = $1", "cs.academic_year_id = $2"];
  let i = 3;
  if (filters?.classId) {
    where.push(`cs.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters?.level) {
    where.push(`c.level = $${i++}`);
    values.push(filters.level);
  }
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
     WHERE ${where.join(" AND ")}
     ORDER BY c.name, c.stream, s.name`,
    values,
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

export type TeacherWorkloadSummaryRow = {
  teacherId: string;
  teacherName: string;
  role: string;
  assignmentCount: number;
};

export type TeachersWorkloadSummary = {
  teachers: TeacherWorkloadSummaryRow[];
  totalSlots: number;
  assignedSlots: number;
  unassignedSlots: number;
  averageAssignments: number;
  maxAssignments: number;
};

export async function getTeachersWorkloadSummary(
  academicYearId: string,
  filters?: { classId?: string; level?: string },
): Promise<TeachersWorkloadSummary> {
  const classFilter = filters?.classId ?? null;
  const levelFilter = filters?.level ?? null;

  const { rows: slotRows } = await query<{
    total: number;
    assigned: number;
    unassigned: number;
  }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE cs.teacher_id IS NOT NULL)::int AS assigned,
       COUNT(*) FILTER (WHERE cs.teacher_id IS NULL)::int AS unassigned
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.academic_year_id = $1
       AND ($2::uuid IS NULL OR cs.class_id = $2::uuid)
       AND ($3::text IS NULL OR c.level = $3::text)`,
    [academicYearId, classFilter, levelFilter],
  );
  const slots = slotRows[0] ?? { total: 0, assigned: 0, unassigned: 0 };

  const { rows } = await query<{
    teacher_id: string;
    teacher_name: string;
    role: string;
    assignment_count: number;
  }>(
    `SELECT
       u.id AS teacher_id,
       u.full_name AS teacher_name,
       u.role,
       COUNT(cs.id)::int AS assignment_count
     FROM users u
     LEFT JOIN class_subjects cs
       ON cs.teacher_id = u.id
      AND cs.academic_year_id = $1
      AND ($2::uuid IS NULL OR cs.class_id = $2::uuid)
     LEFT JOIN classes c ON c.id = cs.class_id
     WHERE u.deleted_at IS NULL
       AND u.is_active = true
       AND u.role = ANY($3::text[])
       AND (
         cs.id IS NULL
         OR $4::text IS NULL
         OR c.level = $4::text
       )
     GROUP BY u.id, u.full_name, u.role
     ORDER BY assignment_count DESC, u.full_name`,
    [academicYearId, classFilter, TEACHING_STAFF_ROLES, levelFilter],
  );

  const teachers = rows.map((r) => ({
    teacherId: r.teacher_id,
    teacherName: r.teacher_name,
    role: r.role,
    assignmentCount: r.assignment_count,
  }));

  const withAssignments = teachers.filter((t) => t.assignmentCount > 0);
  const sum = withAssignments.reduce((s, t) => s + t.assignmentCount, 0);
  const averageAssignments =
    withAssignments.length > 0
      ? Math.round((sum / withAssignments.length) * 10) / 10
      : 0;
  const maxAssignments = teachers.reduce((m, t) => Math.max(m, t.assignmentCount), 0);

  return {
    teachers,
    totalSlots: slots.total,
    assignedSlots: slots.assigned,
    unassignedSlots: slots.unassigned,
    averageAssignments,
    maxAssignments,
  };
}

export type UnassignedClassSubjectRow = {
  id: string;
  className: string;
  classStream: string;
  subjectName: string;
  termName: string | null;
};

const TEACHING_STAFF_ROLES = ["subject_teacher", "headteacher", "admin", "class_teacher"] as const;

export type TeachingStaffRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  specializationCount: number;
};

export async function listTeachingStaff(): Promise<TeachingStaffRow[]> {
  const { rows } = await query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.role,
       COALESCE(spec.cnt, 0)::int AS specialization_count
     FROM users u
     LEFT JOIN (
       SELECT teacher_id, COUNT(*)::int AS cnt
       FROM teacher_subject_specializations
       GROUP BY teacher_id
     ) spec ON spec.teacher_id = u.id
     WHERE u.deleted_at IS NULL
       AND u.is_active = true
       AND u.role = ANY($1::text[])
     ORDER BY u.full_name`,
    [TEACHING_STAFF_ROLES],
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x["id"]),
      fullName: String(x["full_name"]),
      email: String(x["email"]),
      role: String(x["role"]),
      specializationCount: Number(x["specialization_count"] ?? 0),
    };
  });
}

export type TeacherSpecializationRow = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  level: string;
};

export async function getTeacherSpecializations(teacherId: string): Promise<TeacherSpecializationRow[]> {
  const { rows } = await query(
    `SELECT
       s.id AS subject_id,
       s.name AS subject_name,
       s.code AS subject_code,
       s.level
     FROM teacher_subject_specializations tss
     JOIN subjects s ON s.id = tss.subject_id
     WHERE tss.teacher_id = $1
     ORDER BY s.code`,
    [teacherId],
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      subjectId: String(x["subject_id"]),
      subjectName: String(x["subject_name"]),
      subjectCode: String(x["subject_code"]),
      level: String(x["level"]),
    };
  });
}

export async function setTeacherSpecializations(teacherId: string, subjectIds: string[]) {
  const { rows: userRows } = await query<{ role: string }>(
    `SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [teacherId],
  );
  if (!userRows[0]) throw new HttpError(404, "User not found");
  if (!["subject_teacher", "class_teacher"].includes(userRows[0].role)) {
    throw new HttpError(400, "Specializations apply only to subject and class teachers");
  }
  const uniqueIds = [...new Set(subjectIds)];
  if (uniqueIds.length > 0) {
    const { rows: subjectRows } = await query(
      `SELECT id FROM subjects WHERE id = ANY($1::uuid[])`,
      [uniqueIds],
    );
    if (subjectRows.length !== uniqueIds.length) {
      throw new HttpError(400, "One or more subjects were not found");
    }
  }

  const client = getRequestDbClient();
  const exec = client
    ? (sql: string, params: unknown[]) => client.query(sql, params)
    : (sql: string, params: unknown[]) => query(sql, params);

  await exec(`DELETE FROM teacher_subject_specializations WHERE teacher_id = $1::uuid`, [teacherId]);
  if (uniqueIds.length > 0) {
    await exec(
      `INSERT INTO teacher_subject_specializations (teacher_id, subject_id)
       SELECT $1::uuid, unnest($2::uuid[])`,
      [teacherId, uniqueIds],
    );
  }

  return getTeacherSpecializations(teacherId);
}

export async function getEligibleTeachers(filters: {
  subjectIds: string[];
  classId?: string;
}): Promise<TeachingStaffRow[]> {
  const uniqueSubjectIds = [...new Set(filters.subjectIds)];
  if (uniqueSubjectIds.length === 0) return listTeachingStaff();

  let classLevel: string | null = null;
  if (filters.classId) {
    const { rows: classRows } = await query<{ level: string }>(
      `SELECT level FROM classes WHERE id = $1`,
      [filters.classId],
    );
    if (!classRows[0]) throw new HttpError(404, "Class not found");
    classLevel = normalizeLevel(classRows[0].level);
    const { rows: subjectRows } = await query(
      `SELECT id, level FROM subjects WHERE id = ANY($1::uuid[])`,
      [uniqueSubjectIds],
    );
    if (subjectRows.length !== uniqueSubjectIds.length) {
      throw new HttpError(400, "One or more subjects were not found");
    }
    for (const s of subjectRows as { id: string; level: string }[]) {
      if (normalizeLevel(s.level) !== classLevel) {
        throw new HttpError(
          400,
          "All selected subjects must match the class level (O-Level or A-Level)",
        );
      }
    }
  }

  const specMatchSql = `(
    NOT EXISTS (SELECT 1 FROM teacher_subject_specializations tss WHERE tss.teacher_id = u.id)
    OR (
      SELECT COUNT(DISTINCT tss.subject_id)
      FROM teacher_subject_specializations tss
      WHERE tss.teacher_id = u.id
        AND tss.subject_id = ANY($1::uuid[])
    ) = $2
  )`;
  const homeroomSql = filters.classId
    ? `(
         EXISTS (
           SELECT 1 FROM class_teacher_assignments cta
           WHERE cta.class_id = $3 AND cta.teacher_id = u.id AND cta.is_homeroom = true
         )
         OR EXISTS (
           SELECT 1 FROM classes hc
           WHERE hc.id = $3 AND hc.class_teacher_id = u.id
         )
       )`
    : "FALSE";
  const queryParams: unknown[] = [uniqueSubjectIds, uniqueSubjectIds.length];
  if (filters.classId) queryParams.push(filters.classId);

  const { rows } = await query(
    `SELECT DISTINCT
       u.id,
       u.full_name,
       u.email,
       u.role,
       COALESCE(spec.cnt, 0)::int AS specialization_count
     FROM users u
     LEFT JOIN (
       SELECT teacher_id, COUNT(*)::int AS cnt
       FROM teacher_subject_specializations
       GROUP BY teacher_id
     ) spec ON spec.teacher_id = u.id
     WHERE u.deleted_at IS NULL
       AND u.is_active = true
       AND (
         u.role IN ('admin', 'headteacher')
         OR (u.role = 'subject_teacher' AND ${specMatchSql})
         OR (u.role = 'class_teacher' AND (${homeroomSql} OR ${specMatchSql}))
       )
     ORDER BY u.full_name`,
    queryParams,
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x["id"]),
      fullName: String(x["full_name"]),
      email: String(x["email"]),
      role: String(x["role"]),
      specializationCount: Number(x["specialization_count"] ?? 0),
    };
  });
}

export async function assertTeacherCanTeachClassSubjects(
  teacherId: string,
  classSubjectIds: string[],
): Promise<void> {
  const { rows } = await query(
    `SELECT
       cs.id,
       cs.class_id,
       cs.subject_id,
       cs.academic_year_id,
       s.name AS subject_name,
       s.level AS subject_level,
       c.level AS class_level,
       c.name AS class_name,
       c.stream AS class_stream
     FROM class_subjects cs
     JOIN subjects s ON s.id = cs.subject_id
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.id = ANY($1::uuid[])`,
    [classSubjectIds],
  );
  if (rows.length !== classSubjectIds.length) {
    throw new HttpError(400, "One or more class-subject rows were not found");
  }
  const byClass = new Map<string, { subjectIds: string[]; yearId: string }>();
  for (const r of rows) {
    const x = r as { class_id: string; subject_id: string; academic_year_id: string; subject_level: string; class_level: string };
    if (normalizeLevel(x.subject_level) !== normalizeLevel(x.class_level)) {
      throw new HttpError(400, "Cannot assign: subject level does not match class level for one or more rows");
    }
    const bucket = byClass.get(x.class_id) ?? { subjectIds: [], yearId: x.academic_year_id };
    bucket.subjectIds.push(x.subject_id);
    byClass.set(x.class_id, bucket);
  }
  for (const [classId, { subjectIds }] of byClass) {
    const eligible = await getEligibleTeachers({ subjectIds: [...new Set(subjectIds)], classId });
    if (!eligible.some((t) => t.id === teacherId)) {
      const { rows: userRows } = await query<{ full_name: string }>(
        `SELECT full_name FROM users WHERE id = $1`,
        [teacherId],
      );
      const name = userRows[0]?.full_name ?? "Teacher";
      throw new HttpError(
        400,
        `${name} cannot be assigned to teach all selected subject(s) in this class. Class teachers may teach any subject in their homeroom class; other teachers need matching teachable subjects.`,
      );
    }
  }
}

export async function getUnassignedClassSubjects(
  academicYearId: string,
  filters?: { classId?: string; teacherId?: string; level?: string },
): Promise<UnassignedClassSubjectRow[]> {
  const values: unknown[] = [academicYearId];
  const where: string[] = ["cs.teacher_id IS NULL", "cs.academic_year_id = $1"];
  let i = 2;
  if (filters?.classId) {
    where.push(`cs.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters?.level) {
    where.push(`c.level = $${i++}`);
    values.push(filters.level);
  }
  if (filters?.teacherId) {
    where.push(teacherEligibilitySql(`$${i++}`));
    values.push(filters.teacherId);
  }
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
     WHERE ${where.join(" AND ")}
     ORDER BY c.name, c.stream, s.name`,
    values,
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

export type ClassTeacherAssignmentRow = {
  id: string;
  classId: string;
  className: string;
  classStream: string;
  teacherId: string;
  teacherName: string;
  teacherRole: string;
  academicYearId: string;
  academicYearName: string;
  isHomeroom: boolean;
};

export type TeacherClassRow = {
  classId: string;
  className: string;
  classStream: string;
  level: string;
  academicYearId: string;
  academicYearName: string;
  isHomeroom: boolean;
  studentCount: number;
};

export async function listClassTeacherAssignments(filters: {
  classId?: string;
  teacherId?: string;
  academicYearId?: string;
  level?: string;
}): Promise<ClassTeacherAssignmentRow[]> {
  const where: string[] = ["1=1"];
  const values: unknown[] = [];
  let i = 1;
  if (filters.classId) {
    where.push(`cta.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters.teacherId) {
    where.push(`cta.teacher_id = $${i++}`);
    values.push(filters.teacherId);
  }
  if (filters.academicYearId) {
    where.push(`cta.academic_year_id = $${i++}`);
    values.push(filters.academicYearId);
  }
  if (filters.level) {
    where.push(`c.level = $${i++}`);
    values.push(filters.level);
  }
  const { rows } = await query(
    `SELECT
       cta.id,
       cta.class_id,
       c.name AS class_name,
       c.stream AS class_stream,
       cta.teacher_id,
       u.full_name AS teacher_name,
       u.role AS teacher_role,
       cta.academic_year_id,
       ay.name AS academic_year_name,
       cta.is_homeroom
     FROM class_teacher_assignments cta
     JOIN classes c ON c.id = cta.class_id
     JOIN users u ON u.id = cta.teacher_id
     JOIN academic_years ay ON ay.id = cta.academic_year_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.name, c.stream, cta.is_homeroom DESC, u.full_name`,
    values,
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x["id"]),
      classId: String(x["class_id"]),
      className: String(x["class_name"]),
      classStream: String(x["class_stream"]),
      teacherId: String(x["teacher_id"]),
      teacherName: String(x["teacher_name"]),
      teacherRole: String(x["teacher_role"]),
      academicYearId: String(x["academic_year_id"]),
      academicYearName: String(x["academic_year_name"]),
      isHomeroom: Boolean(x["is_homeroom"]),
    };
  });
}

export async function setClassTeacherAssignments(
  classId: string,
  input: { academicYearId: string; teachers: { teacherId: string; isHomeroom?: boolean }[] },
) {
  const { rows: classRows } = await query<{ academic_year_id: string }>(
    `SELECT academic_year_id FROM classes WHERE id = $1`,
    [classId],
  );
  if (!classRows[0]) throw new HttpError(404, "Class not found");
  if (classRows[0].academic_year_id !== input.academicYearId) {
    throw new HttpError(400, "Academic year does not match this class");
  }

  const unique = new Map<string, boolean>();
  for (const t of input.teachers) {
    if (unique.has(t.teacherId)) {
      unique.set(t.teacherId, unique.get(t.teacherId)! || Boolean(t.isHomeroom));
    } else {
      unique.set(t.teacherId, Boolean(t.isHomeroom));
    }
  }
  let homeroomCount = 0;
  for (const isH of unique.values()) {
    if (isH) homeroomCount += 1;
  }
  if (homeroomCount > 1) {
    throw new HttpError(400, "Only one homeroom (class head) teacher is allowed per class");
  }

  const teacherIds = [...unique.keys()];
  if (teacherIds.length > 0) {
    const { rows: users } = await query<{
      id: string;
      full_name: string;
      role: string;
      is_active: boolean;
      deleted_at: string | null;
    }>(
      `SELECT id, full_name, role, is_active, deleted_at
       FROM users
       WHERE id = ANY($1::uuid[])`,
      [teacherIds],
    );
    const byId = new Map(users.map((u) => [u.id, u]));
    const problems: string[] = [];
    for (const teacherId of teacherIds) {
      const u = byId.get(teacherId);
      if (!u) {
        problems.push(`Teacher not found (invalid ID)`);
        continue;
      }
      if (u.deleted_at) {
        problems.push(`${u.full_name} (deleted account)`);
      } else if (!u.is_active) {
        problems.push(`${u.full_name} (inactive account)`);
      } else if (!TEACHING_STAFF_ROLES.includes(u.role as (typeof TEACHING_STAFF_ROLES)[number])) {
        problems.push(
          `${u.full_name} (role "${u.role.replace(/_/g, " ")}" cannot be assigned to a class)`,
        );
      }
    }
    if (problems.length > 0) {
      const detail =
        problems.length === 1
          ? problems[0]
          : problems.map((p, i) => `${i + 1}. ${p}`).join(" ");
      throw new HttpError(400, `Cannot assign class teachers: ${detail}.`);
    }
  }

  await query(
    `DELETE FROM class_teacher_assignments WHERE class_id = $1 AND academic_year_id = $2`,
    [classId, input.academicYearId],
  );

  for (const [teacherId, isHomeroom] of unique) {
    await query(
      `INSERT INTO class_teacher_assignments (class_id, teacher_id, academic_year_id, is_homeroom)
       VALUES ($1, $2, $3, $4)`,
      [classId, teacherId, input.academicYearId, isHomeroom],
    );
  }

  await syncHomeroomOnClass(classId, input.academicYearId);
  return listClassTeacherAssignments({ classId, academicYearId: input.academicYearId });
}

export async function listTeacherClasses(
  teacherId: string,
  academicYearId?: string,
): Promise<TeacherClassRow[]> {
  const values: unknown[] = [teacherId];
  let yearClauseCta = "";
  let yearClauseCs = "";
  if (academicYearId) {
    yearClauseCta = " AND cta.academic_year_id = $2";
    yearClauseCs = " AND cs.academic_year_id = $2";
    values.push(academicYearId);
  }
  const { rows } = await query(
    `WITH my_classes AS (
       SELECT
         c.id AS class_id,
         c.name AS class_name,
         c.stream AS class_stream,
         c.level,
         cta.academic_year_id,
         ay.name AS academic_year_name,
         cta.is_homeroom
       FROM class_teacher_assignments cta
       JOIN classes c ON c.id = cta.class_id
       JOIN academic_years ay ON ay.id = cta.academic_year_id
       WHERE cta.teacher_id = $1${yearClauseCta}
       UNION
       SELECT
         c.id,
         c.name,
         c.stream,
         c.level,
         cs.academic_year_id,
         ay.name,
         false AS is_homeroom
       FROM class_subjects cs
       JOIN classes c ON c.id = cs.class_id
       JOIN academic_years ay ON ay.id = cs.academic_year_id
       WHERE cs.teacher_id = $1${yearClauseCs}
     )
     SELECT
       mc.class_id,
       mc.class_name,
       mc.class_stream,
       mc.level,
       mc.academic_year_id,
       mc.academic_year_name,
       BOOL_OR(mc.is_homeroom) AS is_homeroom,
       COUNT(st.id)::int AS student_count
     FROM my_classes mc
     LEFT JOIN students st ON st.class_id = mc.class_id AND st.status = 'active'
     GROUP BY mc.class_id, mc.class_name, mc.class_stream, mc.level, mc.academic_year_id, mc.academic_year_name
     ORDER BY mc.class_name, mc.class_stream`,
    values,
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      classId: String(x["class_id"]),
      className: String(x["class_name"]),
      classStream: String(x["class_stream"]),
      level: String(x["level"]),
      academicYearId: String(x["academic_year_id"]),
      academicYearName: String(x["academic_year_name"]),
      isHomeroom: Boolean(x["is_homeroom"]),
      studentCount: Number(x["student_count"] ?? 0),
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
      `INSERT INTO cbc_strands (
         subject_id,
         name,
         strand_name,
         code,
         description,
         competencies,
         updated_at
       )
       VALUES ($1, $2, $2, $3, $4, $5::jsonb, NOW()) RETURNING *`,
      [
        input.subjectId,
        input.name,
        input.code.toUpperCase(),
        input.description ?? null,
        JSON.stringify(input.competencies ?? []),
      ],
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
      COALESCE(st.name, st.strand_name) AS name,
      st.code,
      st.description,
      COALESCE(
        jsonb_agg(DISTINCT ss.name) FILTER (WHERE ss.id IS NOT NULL),
        st.competencies,
        '[]'::jsonb
      ) AS competencies,
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
      COALESCE(st.name, st.strand_name) AS name,
      st.code,
      st.description,
      s.name AS "subjectName",
      COALESCE(
        jsonb_agg(DISTINCT ss.name) FILTER (WHERE ss.id IS NOT NULL),
        st.competencies,
        '[]'::jsonb
      ) AS competencies,
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
    sets.push(`strand_name = $${i++}`);
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

export async function listGradingScales(level?: "O_LEVEL" | "A_LEVEL") {
  const values: unknown[] = [];
  const where = level ? "WHERE level = $1" : "";
  if (level) values.push(level);
  const { rows } = await query(
    `SELECT id, level, grade, min_score, max_score, points, descriptor, sort_order, is_active
     FROM assessment_grading_scales
     ${where}
     ORDER BY level, sort_order, min_score DESC`,
    values,
  );
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    id: r["id"],
    level: r["level"],
    grade: r["grade"],
    minScore: Number(r["min_score"]),
    maxScore: Number(r["max_score"]),
    points: Number(r["points"]),
    descriptor: r["descriptor"] as string | null,
    sortOrder: Number(r["sort_order"]),
    isActive: Boolean(r["is_active"]),
  }));
}

export async function replaceGradingScale(input: GradingScaleUpsertIn) {
  const rows = [...input.rows].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  const validationError = validateGradingScaleRows(
    rows.map((r) => ({
      grade: r.grade,
      minScore: r.minScore,
      maxScore: r.maxScore,
      isActive: r.isActive,
    })),
  );
  if (validationError) throw new HttpError(400, validationError);

  await query("BEGIN");
  try {
    await query(`DELETE FROM assessment_grading_scales WHERE level = $1`, [input.level]);
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      await query(
        `INSERT INTO assessment_grading_scales
          (level, grade, min_score, max_score, points, descriptor, sort_order, is_active, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [
          input.level,
          row.grade.toUpperCase(),
          row.minScore,
          row.maxScore,
          row.points,
          row.descriptor ?? null,
          row.sortOrder ?? i + 1,
          row.isActive ?? true,
        ],
      );
    }
    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
  return listGradingScales(input.level);
}
