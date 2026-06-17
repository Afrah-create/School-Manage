import type {
  CreateExamInput,
  ExamMarksBulkInput,
  SaveExamEntriesInput,
  UpdateExamInput,
} from "@uganda-cbc-sms/shared";
import { query } from "../../config/db";
import { writeAuditLog } from "../audit/audit.service";
import { HttpError } from "../../utils/httpError";
import { normalizeClassLevel } from "../../utils/classLevel";
import { resolveConfiguredGrade } from "../../utils/gradingScales";
import {
  assertTeacherIsAssignedSubjectTeacher,
  teacherIsAssignedSubjectTeacher,
} from "../../utils/teacherTeachingAccess";
import {
  assertStudentsEnteredForMarks,
  countEntrantsForSubject,
  normalizeExamPapers,
  replaceExamPapers,
  seedCompulsoryEntries,
} from "./examEntries";

type ExamRow = {
  id: string;
  name: string;
  academic_year_id: string;
  term_id: string;
  class_id: string;
  exam_date: string | null;
  max_score: string;
  status: string;
  created_by: string | null;
  opened_at: Date | null;
  closed_at: Date | null;
  created_at: Date;
  deleted_at?: Date | null;
  class_name?: string;
  class_stream?: string | null;
  class_level?: string;
  subject_count?: string;
};

function mapExam(row: ExamRow) {
  return {
    id: row.id,
    name: row.name,
    isArchived: row.deleted_at != null,
    academicYearId: row.academic_year_id,
    termId: row.term_id,
    classId: row.class_id,
    className: row.class_name,
    classStream: row.class_stream ?? null,
    classLevel: row.class_level ? normalizeClassLevel(row.class_level) : undefined,
    examDate: row.exam_date,
    maxScore: Number(row.max_score),
    status: row.status as "draft" | "open" | "closed",
    createdBy: row.created_by,
    openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : null,
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    subjectCount: row.subject_count != null ? Number(row.subject_count) : undefined,
  };
}

async function getExamRow(id: string, options?: { includeArchived?: boolean }) {
  const archivedClause = options?.includeArchived ? "" : " AND e.deleted_at IS NULL";
  const { rows } = await query<ExamRow & { deleted_at: Date | null }>(
    `SELECT e.*, c.name AS class_name, c.stream AS class_stream, c.level AS class_level,
            (SELECT COUNT(*)::text FROM exam_subjects es WHERE es.exam_id = e.id) AS subject_count
     FROM exams e
     JOIN classes c ON c.id = e.class_id
     WHERE e.id = $1${archivedClause}`,
    [id],
  );
  if (rows.length === 0) throw new HttpError(404, "We could not find that exam. It may have been removed.");
  return rows[0]!;
}

async function getExamMarkingProgress(examId: string, classId: string) {
  const [{ rows: sub }, { rows: st }, { rows: marks }, { rows: entries }] = await Promise.all([
    query<{ total: number; submitted: number }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE COALESCE(ess.is_submitted, false))::int AS submitted
       FROM exam_subjects es
       LEFT JOIN exam_subject_submissions ess
         ON ess.exam_id = es.exam_id AND ess.subject_id = es.subject_id
       WHERE es.exam_id = $1`,
      [examId],
    ),
    query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM students WHERE class_id = $1 AND status = 'active'`,
      [classId],
    ),
    query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM exam_marks WHERE exam_id = $1`,
      [examId],
    ),
    query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM exam_student_entries WHERE exam_id = $1`,
      [examId],
    ),
  ]);
  const totalSubjects = sub[0]?.total ?? 0;
  const submittedSubjects = sub[0]?.submitted ?? 0;
  return {
    totalSubjects,
    submittedSubjects,
    pendingSubjects: Math.max(0, totalSubjects - submittedSubjects),
    activeStudents: st[0]?.c ?? 0,
    marksEntered: marks[0]?.c ?? 0,
    totalEntries: entries[0]?.c ?? 0,
  };
}

async function countLinkedReports(examId: string): Promise<number> {
  const { rows } = await query<{ c: number }>(
    `SELECT (
       (SELECT COUNT(*)::int FROM cbc_report_cards
        WHERE payload->>'sourceExamId' = $1
           OR payload->'formalExam'->>'examId' = $1)
       +
       (SELECT COUNT(*)::int FROM alevel_results
        WHERE payload->>'sourceExamId' = $1
           OR payload->'formalExam'->>'examId' = $1)
     ) AS c`,
    [examId],
  );
  return rows[0]?.c ?? 0;
}

async function assertSubjectsBelongToClass(classId: string, academicYearId: string, subjectIds: string[]) {
  const { rows } = await query<{ subject_id: string }>(
    `SELECT subject_id FROM class_subjects
     WHERE class_id = $1 AND academic_year_id = $2 AND subject_id = ANY($3::uuid[])`,
    [classId, academicYearId, subjectIds],
  );
  if (rows.length !== subjectIds.length) {
    throw new HttpError(
      400,
      "One or more subjects are not assigned to this class for the selected academic year. Choose subjects from the class timetable.",
    );
  }
}

async function gradingLevelForClass(classId: string): Promise<"O_LEVEL" | "A_LEVEL"> {
  const { rows } = await query<{ level: string }>(`SELECT level FROM classes WHERE id = $1`, [classId]);
  if (rows.length === 0) return "O_LEVEL";
  return normalizeClassLevel(rows[0]!.level);
}

export async function createExam(input: CreateExamInput, createdBy: string) {
  const term = await query<{ academic_year_id: string }>(`SELECT academic_year_id FROM terms WHERE id = $1`, [
    input.termId,
  ]);
  if (term.rows.length === 0) throw new HttpError(400, "The selected term is not valid. Refresh the page and try again.");
  if (term.rows[0]!.academic_year_id !== input.academicYearId) {
    throw new HttpError(400, "The term you selected does not belong to the chosen academic year.");
  }

  const papers = normalizeExamPapers(input);
  await assertSubjectsBelongToClass(
    input.classId,
    input.academicYearId,
    papers.map((p) => p.subjectId),
  );

  const ins = await query<{ id: string }>(
    `INSERT INTO exams (name, academic_year_id, term_id, class_id, exam_date, max_score, status, created_by)
     VALUES ($1, $2, $3, $4, $5::date, $6, 'draft', $7)
     RETURNING id`,
    [
      input.name.trim(),
      input.academicYearId,
      input.termId,
      input.classId,
      input.examDate?.trim() || null,
      input.maxScore,
      createdBy,
    ],
  );
  const examId = ins.rows[0]!.id;
  await replaceExamPapers(examId, papers);
  await seedCompulsoryEntries(examId, input.classId);
  return getExamById(examId);
}

export async function updateExam(id: string, input: UpdateExamInput) {
  const exam = await getExamRow(id);
  if (exam.status !== "draft") {
    throw new HttpError(400, "Only draft exams can be edited. Close the exam first if you need to make changes after opening.");
  }

  const paperInput = normalizeExamPapers({
    papers: input.papers,
    subjectIds: input.subjectIds,
  });
  if (paperInput.length) {
    await assertSubjectsBelongToClass(
      exam.class_id,
      exam.academic_year_id,
      paperInput.map((p) => p.subjectId),
    );
    await replaceExamPapers(id, paperInput);
    await seedCompulsoryEntries(id, exam.class_id);
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) {
    sets.push(`name = $${i++}`);
    values.push(input.name.trim());
  }
  if (input.examDate !== undefined) {
    sets.push(`exam_date = $${i++}`);
    values.push(input.examDate || null);
  }
  if (input.maxScore !== undefined) {
    sets.push(`max_score = $${i++}`);
    values.push(input.maxScore);
  }
  if (sets.length) {
    sets.push("updated_at = NOW()");
    values.push(id);
    await query(`UPDATE exams SET ${sets.join(", ")} WHERE id = $${i}`, values);
  }

  return getExamById(id);
}

/** Soft-delete: hides exam from lists; marks remain for audit. */
export async function archiveExam(id: string, archivedBy?: string) {
  await getExamRow(id);
  const { rowCount } = await query(
    `UPDATE exams
     SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, archivedBy ?? null],
  );
  if (!rowCount) {
    throw new HttpError(404, "We could not find that exam. It may have been removed.");
  }
  void writeAuditLog({
    category: "exams",
    severity: "warning",
    outcome: "success",
    action: "EXAM_ARCHIVED",
    message: "Exam archived (hidden from active lists)",
    actorId: archivedBy ?? null,
    resourceType: "exam",
    resourceId: id,
  });
}

/** @deprecated alias — use archiveExam */
export const deleteExam = archiveExam;

export async function restoreExam(id: string) {
  const row = await getExamRow(id, { includeArchived: true });
  if (!row.deleted_at) {
    throw new HttpError(400, "This exam is already active and not archived.");
  }
  const { rowCount } = await query(
    `UPDATE exams SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW() WHERE id = $1`,
    [id],
  );
  if (!rowCount) throw new HttpError(404, "We could not find that exam.");
}

export async function getExamDeletionImpact(id: string) {
  const row = await getExamRow(id, { includeArchived: true });
  const marksCount = (
    await query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM exam_marks WHERE exam_id = $1`, [id])
  ).rows[0]?.c ?? 0;
  const linkedReportCount = await countLinkedReports(id);
  const isArchived = Boolean(row.deleted_at);

  let canPermanentDelete = true;
  let blockReason: string | null = null;

  if (linkedReportCount > 0) {
    canPermanentDelete = false;
    blockReason = `${linkedReportCount} report card snapshot(s) reference this exam. Reports keep historical data; permanent delete is not allowed. Archive the exam instead.`;
  } else if (!isArchived) {
    if (row.status !== "draft") {
      canPermanentDelete = false;
      blockReason =
        "Archive this exam first. Permanent deletion applies to archived exams or unused drafts only.";
    } else if (marksCount > 0) {
      canPermanentDelete = false;
      blockReason = "This draft has saved marks. Archive it first, then permanently delete from the archive.";
    }
  }

  return {
    examName: row.name,
    status: row.status as "draft" | "open" | "closed",
    isArchived,
    marksCount,
    linkedReportCount,
    canPermanentDelete,
    blockReason,
  };
}

export async function permanentDeleteExam(id: string, confirmName: string, actorId?: string) {
  const impact = await getExamDeletionImpact(id);
  if (!impact.canPermanentDelete) {
    throw new HttpError(400, impact.blockReason ?? "This exam cannot be permanently deleted.");
  }
  if (impact.examName.trim() !== confirmName.trim()) {
    throw new HttpError(400, "The confirmation name does not match this exam. Type the exact exam name.");
  }

  const { rowCount } = await query(`DELETE FROM exams WHERE id = $1`, [id]);
  if (!rowCount) throw new HttpError(404, "We could not find that exam.");

  void writeAuditLog({
    category: "exams",
    severity: "error",
    outcome: "success",
    action: "EXAM_PERMANENTLY_DELETED",
    message: `Exam permanently deleted: ${impact.examName}`,
    actorId: actorId ?? null,
    resourceType: "exam",
    resourceId: id,
    metadata: { marksRemoved: impact.marksCount },
  });

  return {
    deleted: true,
    marksRemoved: impact.marksCount,
    linkedReportsUnchanged: impact.linkedReportCount,
  };
}

export async function openExam(id: string) {
  const exam = await getExamRow(id);
  if (exam.status !== "draft") {
    throw new HttpError(400, "This exam is already open or closed. Only draft exams can be opened for marking.");
  }
  if (Number(exam.subject_count ?? 0) < 1) {
    throw new HttpError(400, "Add at least one subject before opening the exam for teachers.");
  }
  await seedCompulsoryEntries(id, exam.class_id);

  const entryTotal = (
    await query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM exam_student_entries WHERE exam_id = $1`,
      [id],
    )
  ).rows[0]?.c ?? 0;
  if (entryTotal === 0) {
    throw new HttpError(
      400,
      "No student paper entries are configured. Register students for at least one paper before opening.",
    );
  }

  const { rows: missingComp } = await query<{ subject_code: string }>(
    `SELECT DISTINCT s.code AS subject_code
     FROM exam_subjects es
     JOIN subjects s ON s.id = es.subject_id
     WHERE es.exam_id = $1 AND es.is_compulsory = true
       AND EXISTS (
         SELECT 1 FROM students st
         WHERE st.class_id = $2 AND st.status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM exam_student_entries ese
             WHERE ese.exam_id = $1
               AND ese.student_id = st.id
               AND ese.subject_id = es.subject_id
           )
       )`,
    [id, exam.class_id],
  );
  if (missingComp.length > 0) {
    throw new HttpError(
      400,
      `Not all students are registered for compulsory paper(s): ${missingComp.map((r) => r.subject_code).join(", ")}. Use “Register all for compulsory papers” on the exam page, then open.`,
    );
  }
  await query(
    `UPDATE exams SET status = 'open', opened_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id],
  );
  return getExamById(id);
}

export async function closeExam(id: string, options?: { force?: boolean }) {
  const exam = await getExamRow(id);
  if (exam.status !== "open") {
    throw new HttpError(400, "Only open exams can be closed. Open the exam first so teachers can enter marks.");
  }

  const progress = await getExamMarkingProgress(id, exam.class_id);
  const { rows: pendingRows } = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c
     FROM exam_subjects es
     LEFT JOIN exam_subject_submissions ess
       ON ess.exam_id = es.exam_id AND ess.subject_id = es.subject_id
     WHERE es.exam_id = $1
       AND COALESCE(ess.is_submitted, false) = false
       AND EXISTS (
         SELECT 1 FROM exam_student_entries ese
         WHERE ese.exam_id = es.exam_id AND ese.subject_id = es.subject_id
       )`,
    [id],
  );
  const pendingWithEntrants = pendingRows[0]?.c ?? 0;
  if (pendingWithEntrants > 0 && !options?.force) {
    throw new HttpError(
      400,
      `${pendingWithEntrants} paper(s) with registered students still have unsubmitted marks. Ensure all teachers submit, or force-close if you accept incomplete results.`,
    );
  }

  await query(
    `UPDATE exams SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id],
  );
  await recalculateExamMarkGrades(id);
  return getExamById(id);
}

/** Re-apply the class grading scale to all saved exam marks (fixes legacy mis-graded rows). */
export async function recalculateExamMarkGrades(examId: string) {
  const exam = await getExamRow(examId);
  const level = await gradingLevelForClass(exam.class_id);
  const { rows } = await query<{ id: string; score: string }>(
    `SELECT id, score::text AS score FROM exam_marks WHERE exam_id = $1`,
    [examId],
  );
  for (const row of rows) {
    const score = Number(row.score);
    if (Number.isNaN(score)) continue;
    const { grade, points } = await resolveConfiguredGrade(score, level);
    await query(`UPDATE exam_marks SET grade = $2, points = $3, updated_at = NOW() WHERE id = $1`, [
      row.id,
      grade,
      points,
    ]);
  }
  return { updated: rows.length, level };
}

export async function reopenExam(id: string) {
  const exam = await getExamRow(id);
  if (exam.status !== "closed") {
    throw new HttpError(400, "Only closed exams can be reopened. Draft exams should be opened instead.");
  }
  await query(
    `UPDATE exams SET status = 'open', closed_at = NULL, updated_at = NOW() WHERE id = $1`,
    [id],
  );
  return getExamById(id);
}

export async function listExams(filters: {
  academicYearId?: string;
  termId?: string;
  classId?: string;
  status?: string;
  includeArchived?: boolean;
  archivedOnly?: boolean;
}) {
  const where: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (filters.archivedOnly) {
    where.push("e.deleted_at IS NOT NULL");
  } else if (!filters.includeArchived) {
    where.push("e.deleted_at IS NULL");
  }
  if (filters.academicYearId) {
    where.push(`e.academic_year_id = $${i++}`);
    values.push(filters.academicYearId);
  }
  if (filters.termId) {
    where.push(`e.term_id = $${i++}`);
    values.push(filters.termId);
  }
  if (filters.classId) {
    where.push(`e.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters.status) {
    where.push(`e.status = $${i++}`);
    values.push(filters.status);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query<ExamRow>(
    `SELECT e.*, c.name AS class_name, c.stream AS class_stream, c.level AS class_level,
            (SELECT COUNT(*)::text FROM exam_subjects es WHERE es.exam_id = e.id) AS subject_count
     FROM exams e
     JOIN classes c ON c.id = e.class_id
     ${clause}
     ORDER BY e.exam_date DESC NULLS LAST, e.created_at DESC`,
    values,
  );
  return rows.map(mapExam);
}

export async function getExamById(id: string, options?: { includeArchived?: boolean }) {
  const row = await getExamRow(id, options);
  const exam = mapExam(row);
  const markingProgress = await getExamMarkingProgress(id, row.class_id);
  const { rows: subjects } = await query<{
    id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    is_compulsory: boolean;
    is_submitted: boolean;
    entrants_count: string;
  }>(
    `SELECT es.id, es.subject_id, s.name AS subject_name, s.code AS subject_code,
            es.is_compulsory,
            COALESCE(ess.is_submitted, false) AS is_submitted,
            (SELECT COUNT(*)::text FROM exam_student_entries ese
             WHERE ese.exam_id = es.exam_id AND ese.subject_id = es.subject_id) AS entrants_count
     FROM exam_subjects es
     JOIN subjects s ON s.id = es.subject_id
     LEFT JOIN exam_subject_submissions ess
       ON ess.exam_id = es.exam_id AND ess.subject_id = es.subject_id
     WHERE es.exam_id = $1
     ORDER BY s.code`,
    [id],
  );
  return {
    ...exam,
    markingProgress,
    subjects: subjects.map((s) => ({
      id: s.id,
      subjectId: s.subject_id,
      subjectName: s.subject_name,
      subjectCode: s.subject_code,
      isCompulsory: Boolean(s.is_compulsory),
      isSubmitted: Boolean(s.is_submitted),
      entrantsCount: Number(s.entrants_count ?? 0),
    })),
  };
}

export type ExamMarkingSlot = {
  examId: string;
  examName: string;
  examDate: string | null;
  maxScore: number;
  classId: string;
  className: string;
  classStream: string | null;
  classLevel: "O_LEVEL" | "A_LEVEL";
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isSubmitted: boolean;
  canEdit: boolean;
};

export async function listTeacherMarkingSlots(teacherId: string, role: string): Promise<ExamMarkingSlot[]> {
  if (role === "admin" || role === "headteacher") {
    const exams = await listExams({ status: "open" });
    const slots: ExamMarkingSlot[] = [];
    for (const exam of exams) {
      const detail = await getExamById(exam.id);
      for (const s of detail.subjects) {
        slots.push({
          examId: exam.id,
          examName: exam.name,
          examDate: exam.examDate,
          maxScore: exam.maxScore,
          classId: exam.classId,
          className: exam.className ?? "",
          classStream: exam.classStream ?? null,
          classLevel: exam.classLevel ?? "O_LEVEL",
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          subjectCode: s.subjectCode,
          isSubmitted: Boolean(s.isSubmitted),
          canEdit: exam.status === "open" && !s.isSubmitted,
        });
      }
    }
    return slots;
  }

  const { rows } = await query<{
    exam_id: string;
    exam_name: string;
    exam_date: string | null;
    max_score: string;
    class_id: string;
    class_name: string;
    class_stream: string | null;
    class_level: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    is_submitted: boolean;
  }>(
    `SELECT
        e.id AS exam_id,
        e.name AS exam_name,
        e.exam_date,
        e.max_score,
        e.class_id,
        c.name AS class_name,
        c.stream AS class_stream,
        c.level AS class_level,
        es.subject_id,
        s.name AS subject_name,
        s.code AS subject_code,
        COALESCE(ess.is_submitted, false) AS is_submitted
     FROM exams e
     JOIN classes c ON c.id = e.class_id
     JOIN exam_subjects es ON es.exam_id = e.id
     JOIN subjects s ON s.id = es.subject_id
     JOIN class_subjects cs
       ON cs.class_id = e.class_id
      AND cs.subject_id = es.subject_id
      AND cs.academic_year_id = e.academic_year_id
      AND cs.teacher_id = $1
     LEFT JOIN exam_subject_submissions ess
       ON ess.exam_id = e.id AND ess.subject_id = es.subject_id
     WHERE e.status = 'open' AND e.deleted_at IS NULL
     ORDER BY e.exam_date DESC NULLS LAST, e.name, s.code`,
    [teacherId],
  );

  return rows.map((r) => ({
    examId: r.exam_id,
    examName: r.exam_name,
    examDate: r.exam_date,
    maxScore: Number(r.max_score),
    classId: r.class_id,
    className: r.class_name,
    classStream: r.class_stream,
    classLevel: normalizeClassLevel(r.class_level),
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    subjectCode: r.subject_code,
    isSubmitted: Boolean(r.is_submitted),
    canEdit: !r.is_submitted,
  }));
}

/** @deprecated Prefer listTeacherMarkingSlots for teacher UI */
export async function listOpenExamsForTeacher(teacherId: string, role: string) {
  if (role === "admin" || role === "headteacher") {
    return listExams({ status: "open" });
  }

  const { rows } = await query<ExamRow>(
    `SELECT DISTINCT e.*, c.name AS class_name, c.stream AS class_stream, c.level AS class_level,
            (SELECT COUNT(*)::text FROM exam_subjects es2 WHERE es2.exam_id = e.id) AS subject_count
     FROM exams e
     JOIN classes c ON c.id = e.class_id
     JOIN exam_subjects es ON es.exam_id = e.id
     JOIN class_subjects cs
       ON cs.class_id = e.class_id
      AND cs.subject_id = es.subject_id
      AND cs.academic_year_id = e.academic_year_id
      AND cs.teacher_id = $1
     WHERE e.status = 'open' AND e.deleted_at IS NULL
     ORDER BY e.exam_date DESC NULLS LAST, e.name`,
    [teacherId],
  );
  return rows.map(mapExam);
}

export async function listTeacherSubjectsForExam(examId: string, teacherId: string, role: string) {
  const exam = await getExamRow(examId);
  if (exam.status !== "open" && role !== "admin" && role !== "headteacher") {
    throw new HttpError(403, "This exam is not open for marking. Contact the administrator if you believe this is a mistake.");
  }

  const { rows } = await query<{
    subject_id: string;
    subject_name: string;
    subject_code: string;
    is_submitted: boolean;
  }>(
    `SELECT es.subject_id, s.name AS subject_name, s.code AS subject_code,
            COALESCE(ess.is_submitted, false) AS is_submitted
     FROM exam_subjects es
     JOIN subjects s ON s.id = es.subject_id
     LEFT JOIN exam_subject_submissions ess
       ON ess.exam_id = es.exam_id AND ess.subject_id = es.subject_id
     WHERE es.exam_id = $1
     ORDER BY s.code`,
    [examId],
  );

  if (role === "admin" || role === "headteacher") {
    return rows.map((r) => ({
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      isSubmitted: Boolean(r.is_submitted),
      canEdit: exam.status === "open" && !r.is_submitted,
    }));
  }

  const allowed = [];
  for (const r of rows) {
    const ok = await teacherIsAssignedSubjectTeacher(
      teacherId,
      exam.class_id,
      r.subject_id,
      exam.academic_year_id,
    );
    if (ok) {
      allowed.push({
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        subjectCode: r.subject_code,
        isSubmitted: Boolean(r.is_submitted),
        canEdit: exam.status === "open" && !r.is_submitted,
      });
    }
  }
  return allowed;
}

export async function getExamForTeacher(
  examId: string,
  teacherId: string,
  role: string,
  options?: { includeArchived?: boolean },
) {
  const allowArchived =
    options?.includeArchived && (role === "admin" || role === "headteacher");
  const exam = await getExamById(examId, allowArchived ? { includeArchived: true } : undefined);
  if (role === "admin" || role === "headteacher") return exam;
  const subjects = await listTeacherSubjectsForExam(examId, teacherId, role);
  return { ...exam, subjects };
}

async function assertSubjectSubmitted(examId: string, subjectId: string) {
  const { rows } = await query<{ is_submitted: boolean }>(
    `SELECT is_submitted FROM exam_subject_submissions WHERE exam_id = $1 AND subject_id = $2`,
    [examId, subjectId],
  );
  if (rows[0]?.is_submitted) {
    throw new HttpError(
      400,
      "Marks for this subject have been submitted and locked. Ask the headteacher or admin to reopen if corrections are needed.",
    );
  }
}

export async function listExamMarks(
  examId: string,
  subjectId: string,
  teacherId?: string,
  role?: string,
) {
  const exam = await getExamRow(examId);
  if (role && role !== "admin" && role !== "headteacher" && teacherId) {
    await assertTeacherIsAssignedSubjectTeacher(
      teacherId,
      exam.class_id,
      subjectId,
      exam.academic_year_id,
    );
  }
  const maxScore = Number(exam.max_score);

  const entrants = await countEntrantsForSubject(examId, subjectId);
  if (entrants === 0) {
    throw new HttpError(
      400,
      "No students are registered for this exam paper. An administrator must configure student entries first.",
    );
  }

  const { rows: students } = await query<{
    id: string;
    full_name: string;
    student_number: string;
    score: string | null;
    grade: string | null;
    points: number | null;
    is_locked: boolean;
  }>(
    `SELECT st.id, st.full_name, st.student_number,
            em.score::text, em.grade, em.points, COALESCE(em.is_locked, false) AS is_locked
     FROM exam_student_entries ese
     JOIN students st ON st.id = ese.student_id
     LEFT JOIN exam_marks em
       ON em.student_id = st.id AND em.exam_id = $1 AND em.subject_id = $2
     WHERE ese.exam_id = $1 AND ese.subject_id = $2
       AND st.status = 'active'
     ORDER BY st.full_name`,
    [examId, subjectId],
  );

  const { rows: sub } = await query<{ is_submitted: boolean }>(
    `SELECT is_submitted FROM exam_subject_submissions WHERE exam_id = $1 AND subject_id = $2`,
    [examId, subjectId],
  );

  return {
    exam: mapExam(exam),
    maxScore,
    subjectSubmitted: Boolean(sub[0]?.is_submitted),
    entrantsCount: entrants,
    students: students.map((s) => ({
      id: s.id,
      fullName: s.full_name,
      studentNumber: s.student_number,
      score: s.score != null ? Number(s.score) : null,
      grade: s.grade,
      points: s.points,
      isLocked: Boolean(s.is_locked),
    })),
  };
}

export async function upsertExamMarks(
  examId: string,
  input: ExamMarksBulkInput,
  teacherId: string,
  role: string,
) {
  const exam = await getExamRow(examId);
  if (exam.status !== "open") {
    throw new HttpError(
      403,
      exam.status === "draft"
        ? "This exam has not been opened yet. An administrator must open it before you can enter marks."
        : "This exam is closed. Marks can no longer be changed.",
    );
  }

  const subjectOnExam = await query(
    `SELECT 1 FROM exam_subjects WHERE exam_id = $1 AND subject_id = $2`,
    [examId, input.subjectId],
  );
  if (subjectOnExam.rows.length === 0) {
    throw new HttpError(400, "That subject is not part of this exam. Choose a subject from the exam list.");
  }

  if (role !== "admin" && role !== "headteacher") {
    await assertTeacherIsAssignedSubjectTeacher(
      teacherId,
      exam.class_id,
      input.subjectId,
      exam.academic_year_id,
    );
  }

  await assertSubjectSubmitted(examId, input.subjectId);
  await assertStudentsEnteredForMarks(
    examId,
    input.subjectId,
    input.marks.map((m) => m.studentId),
  );

  const maxScore = Number(exam.max_score);
  const level = await gradingLevelForClass(exam.class_id);
  let saved = 0;

  for (const item of input.marks) {
    if (item.score > maxScore) {
      throw new HttpError(400, `Scores cannot be higher than ${maxScore} for this exam.`);
    }

    const st = await query(`SELECT id FROM students WHERE id = $1 AND class_id = $2 AND status = 'active'`, [
      item.studentId,
      exam.class_id,
    ]);
    if (st.rows.length === 0) {
      throw new HttpError(400, "One of the students is not in this exam's class or is no longer active.");
    }

    const { grade, points } = await resolveConfiguredGrade(item.score, level);

    await query(
      `INSERT INTO exam_marks (exam_id, student_id, subject_id, score, grade, points, teacher_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (exam_id, student_id, subject_id) DO UPDATE SET
         score = EXCLUDED.score,
         grade = EXCLUDED.grade,
         points = EXCLUDED.points,
         teacher_id = EXCLUDED.teacher_id,
         updated_at = NOW()
       WHERE exam_marks.is_locked = false`,
      [examId, item.studentId, input.subjectId, item.score, grade, points, teacherId],
    );
    saved += 1;
  }

  return { saved, maxScore };
}

export async function submitExamMarks(
  examId: string,
  subjectId: string,
  teacherId: string,
  role: string,
) {
  const exam = await getExamRow(examId);
  if (exam.status !== "open") {
    throw new HttpError(403, "Marks can only be submitted while the exam is open.");
  }

  if (role !== "admin" && role !== "headteacher") {
    await assertTeacherIsAssignedSubjectTeacher(
      teacherId,
      exam.class_id,
      subjectId,
      exam.academic_year_id,
    );
  }

  await assertSubjectSubmitted(examId, subjectId);

  const entrants = await countEntrantsForSubject(examId, subjectId);
  if (entrants === 0) {
    throw new HttpError(
      400,
      "No students are registered for this paper. Configure entries or skip submission if the paper is not used.",
    );
  }

  const { rows: missing } = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c
     FROM exam_student_entries ese
     LEFT JOIN exam_marks em
       ON em.exam_id = ese.exam_id
      AND em.student_id = ese.student_id
      AND em.subject_id = ese.subject_id
     WHERE ese.exam_id = $1 AND ese.subject_id = $2 AND em.id IS NULL`,
    [examId, subjectId],
  );
  if ((missing[0]?.c ?? 0) > 0) {
    throw new HttpError(
      400,
      `${missing[0]!.c} registered student(s) still need marks before this paper can be submitted.`,
    );
  }

  await query(
    `INSERT INTO exam_subject_submissions (exam_id, subject_id, is_submitted, submitted_at, submitted_by)
     VALUES ($1, $2, true, NOW(), $3)
     ON CONFLICT (exam_id, subject_id) DO UPDATE SET
       is_submitted = true, submitted_at = NOW(), submitted_by = EXCLUDED.submitted_by`,
    [examId, subjectId, teacherId],
  );

  await query(
    `UPDATE exam_marks SET is_locked = true, updated_at = NOW()
     WHERE exam_id = $1 AND subject_id = $2`,
    [examId, subjectId],
  );

  return { submitted: true };
}

export async function unlockExamMarks(examId: string, subjectId: string) {
  const exam = await getExamRow(examId);
  if (exam.status === "draft") {
    throw new HttpError(400, "This exam has not been opened yet.");
  }

  await query(
    `UPDATE exam_subject_submissions
     SET is_submitted = false, submitted_at = NULL, submitted_by = NULL
     WHERE exam_id = $1 AND subject_id = $2`,
    [examId, subjectId],
  );
  await query(
    `UPDATE exam_marks SET is_locked = false, updated_at = NOW()
     WHERE exam_id = $1 AND subject_id = $2`,
    [examId, subjectId],
  );

  if (exam.status === "closed") {
    await query(`UPDATE exams SET status = 'open', closed_at = NULL, updated_at = NOW() WHERE id = $1`, [examId]);
  }

  return { unlocked: true };
}

export async function getExamEntries(examId: string) {
  const exam = await getExamRow(examId);
  const [{ rows: students }, { rows: papers }, { rows: entryRows }] = await Promise.all([
    query<{ id: string; full_name: string; student_number: string }>(
      `SELECT id, full_name, student_number
       FROM students
       WHERE class_id = $1 AND status = 'active'
       ORDER BY full_name`,
      [exam.class_id],
    ),
    query<{
      subject_id: string;
      subject_code: string;
      subject_name: string;
      is_compulsory: boolean;
      entrants_count: string;
    }>(
      `SELECT es.subject_id, s.code AS subject_code, s.name AS subject_name,
              es.is_compulsory,
              (SELECT COUNT(*)::text FROM exam_student_entries ese
               WHERE ese.exam_id = es.exam_id AND ese.subject_id = es.subject_id) AS entrants_count
       FROM exam_subjects es
       JOIN subjects s ON s.id = es.subject_id
       WHERE es.exam_id = $1
       ORDER BY s.code`,
      [examId],
    ),
    query<{ student_id: string; subject_id: string }>(
      `SELECT student_id, subject_id FROM exam_student_entries WHERE exam_id = $1`,
      [examId],
    ),
  ]);

  const entriesByStudent: Record<string, string[]> = {};
  for (const st of students) {
    entriesByStudent[st.id] = [];
  }
  for (const e of entryRows) {
    if (!entriesByStudent[e.student_id]) entriesByStudent[e.student_id] = [];
    entriesByStudent[e.student_id]!.push(e.subject_id);
  }

  return {
    students: students.map((s) => ({
      id: s.id,
      fullName: s.full_name,
      studentNumber: s.student_number,
    })),
    papers: papers.map((p) => ({
      subjectId: p.subject_id,
      subjectCode: p.subject_code,
      subjectName: p.subject_name,
      isCompulsory: Boolean(p.is_compulsory),
      entrantsCount: Number(p.entrants_count ?? 0),
    })),
    entriesByStudent,
  };
}

export async function saveExamEntries(examId: string, input: SaveExamEntriesInput) {
  const exam = await getExamRow(examId);
  if (exam.status !== "draft") {
    throw new HttpError(400, "Student entries can only be changed while the exam is a draft.");
  }

  const subjectIds = new Set(
    (
      await query<{ subject_id: string; is_compulsory: boolean }>(
        `SELECT subject_id, is_compulsory FROM exam_subjects WHERE exam_id = $1`,
        [examId],
      )
    ).rows.map((r) => r.subject_id),
  );
  const compulsoryIds = new Set(
    (
      await query<{ subject_id: string }>(
        `SELECT subject_id FROM exam_subjects WHERE exam_id = $1 AND is_compulsory = true`,
        [examId],
      )
    ).rows.map((r) => r.subject_id),
  );

  const activeStudents = new Set(
    (
      await query<{ id: string }>(
        `SELECT id FROM students WHERE class_id = $1 AND status = 'active'`,
        [exam.class_id],
      )
    ).rows.map((r) => r.id),
  );

  let changed = 0;
  for (const item of input.entries) {
    if (!subjectIds.has(item.subjectId)) {
      throw new HttpError(400, "One of the subjects is not part of this exam.");
    }
    if (!activeStudents.has(item.studentId)) {
      throw new HttpError(400, "One of the students is not in this exam's class.");
    }
    if (!item.isEntered && compulsoryIds.has(item.subjectId)) {
      throw new HttpError(
        400,
        "Compulsory papers must include every student in the class. Mark the paper as optional in exam settings instead.",
      );
    }

    if (item.isEntered) {
      await query(
        `INSERT INTO exam_student_entries (exam_id, student_id, subject_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [examId, item.studentId, item.subjectId],
      );
      changed += 1;
    } else {
      await query(
        `DELETE FROM exam_marks
         WHERE exam_id = $1 AND student_id = $2 AND subject_id = $3`,
        [examId, item.studentId, item.subjectId],
      );
      await query(
        `DELETE FROM exam_student_entries
         WHERE exam_id = $1 AND student_id = $2 AND subject_id = $3`,
        [examId, item.studentId, item.subjectId],
      );
      changed += 1;
    }
  }

  return { changed };
}

export async function applyExamEntriesPreset(
  examId: string,
  preset: "compulsory_all_students" | "all_papers_all_students",
) {
  const exam = await getExamRow(examId);
  if (exam.status !== "draft") {
    throw new HttpError(400, "Entry presets can only be applied while the exam is a draft.");
  }

  if (preset === "compulsory_all_students") {
    await seedCompulsoryEntries(examId, exam.class_id);
    return { applied: preset };
  }

  await query(
    `INSERT INTO exam_student_entries (exam_id, student_id, subject_id)
     SELECT $1, st.id, es.subject_id
     FROM students st
     CROSS JOIN exam_subjects es
     WHERE st.class_id = $2 AND st.status = 'active' AND es.exam_id = $1
     ON CONFLICT DO NOTHING`,
    [examId, exam.class_id],
  );
  return { applied: preset };
}
