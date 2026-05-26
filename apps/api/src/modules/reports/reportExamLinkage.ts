import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { resolveConfiguredGrade } from "../../utils/gradingScales";
import { computeAlevelAggregate } from "../../utils/alevelDivision";
import type { ReportFormalExamSection } from "./reportTypes";
import { compileAlevelReportPayload, compileCbcReportPayload } from "./reportCompiler";
import type { AlevelReportPayload, CbcReportPayload } from "./reportTypes";

export type ExamReportOption = {
  id: string;
  name: string;
  status: string;
  examDate: string | null;
  maxScore: number;
  subjectCount: number;
  allSubjectsSubmitted: boolean;
};

export type ExamSubjectTrack = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  studentsWithMarks: number;
  activeStudents: number;
  isSubmitted: boolean;
  status: "not_started" | "in_progress" | "submitted";
};

type ExamRow = {
  id: string;
  name: string;
  class_id: string;
  term_id: string;
  academic_year_id: string;
  max_score: string;
  status: string;
  exam_date: string | null;
};

export async function listExamsForReportOptions(classId: string, termId: string): Promise<ExamReportOption[]> {
  const { rows } = await query<{
    id: string;
    name: string;
    status: string;
    exam_date: string | null;
    max_score: string;
    subject_count: string;
    pending_subjects: string;
  }>(
    `SELECT e.id, e.name, e.status, e.exam_date, e.max_score,
            (SELECT COUNT(*)::text FROM exam_subjects es WHERE es.exam_id = e.id) AS subject_count,
            (SELECT COUNT(*)::text
             FROM exam_subjects es
             LEFT JOIN exam_subject_submissions ess
               ON ess.exam_id = es.exam_id AND ess.subject_id = es.subject_id
             WHERE es.exam_id = e.id AND COALESCE(ess.is_submitted, false) = false) AS pending_subjects
     FROM exams e
     WHERE e.class_id = $1 AND e.term_id = $2 AND e.deleted_at IS NULL
     ORDER BY e.exam_date DESC NULLS LAST, e.name`,
    [classId, termId],
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    examDate: r.exam_date,
    maxScore: Number(r.max_score),
    subjectCount: Number(r.subject_count ?? 0),
    allSubjectsSubmitted: Number(r.subject_count ?? 0) > 0 && Number(r.pending_subjects ?? 0) === 0,
  }));
}

export async function getExamForReports(examId: string, classId: string, termId: string): Promise<ExamRow> {
  const exam = await tryResolveExamForReports(examId, classId, termId);
  if (!exam) {
    throw new HttpError(404, "That exam was not found. It may have been deleted.");
  }
  return exam;
}

/** Returns null when the exam is soft-deleted, missing, or does not match class/term. */
export async function tryResolveExamForReports(
  examId: string,
  classId: string,
  termId: string,
): Promise<ExamRow | null> {
  const { rows } = await query<ExamRow>(
    `SELECT id, name, class_id, term_id, academic_year_id, max_score, status, exam_date
     FROM exams WHERE id = $1 AND deleted_at IS NULL`,
    [examId],
  );
  if (rows.length === 0) return null;
  const exam = rows[0]!;
  if (exam.class_id !== classId || exam.term_id !== termId) return null;
  return exam;
}

export async function isExamActiveForReports(examId: string): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM exams WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [examId],
  );
  return Boolean(rows[0]);
}

export async function listExamSubjectTracking(
  examId: string,
  activeStudents: number,
): Promise<ExamSubjectTrack[]> {
  const { rows: active } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM exams WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [examId],
  );
  if (!active[0]) return [];

  const { rows } = await query<{
    subject_id: string;
    subject_name: string;
    subject_code: string;
    is_submitted: boolean;
    students_with_marks: string;
  }>(
    `SELECT es.subject_id, s.name AS subject_name, s.code AS subject_code,
            COALESCE(ess.is_submitted, false) AS is_submitted,
            (SELECT COUNT(DISTINCT em.student_id)::text
             FROM exam_marks em
             WHERE em.exam_id = es.exam_id AND em.subject_id = es.subject_id) AS students_with_marks
     FROM exam_subjects es
     JOIN subjects s ON s.id = es.subject_id
     LEFT JOIN exam_subject_submissions ess
       ON ess.exam_id = es.exam_id AND ess.subject_id = es.subject_id
     WHERE es.exam_id = $1
     ORDER BY s.code`,
    [examId],
  );

  return rows.map((r) => {
    const studentsWithMarks = Number(r.students_with_marks ?? 0);
    const isSubmitted = Boolean(r.is_submitted);
    let status: ExamSubjectTrack["status"] = "not_started";
    if (isSubmitted) status = "submitted";
    else if (studentsWithMarks > 0) status = "in_progress";

    return {
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      studentsWithMarks,
      activeStudents,
      isSubmitted,
      status,
    };
  });
}

export async function assertExamReadyForReports(examId: string, activeStudents: number) {
  const tracking = await listExamSubjectTracking(examId, activeStudents);
  if (tracking.length === 0) {
    throw new HttpError(400, "This exam has no subjects. Edit the exam and add subjects before generating reports.");
  }
  const pending = tracking.filter((t) => !t.isSubmitted);
  if (pending.length > 0) {
    const codes = pending.map((t) => t.subjectCode).join(", ");
    throw new HttpError(
      400,
      `Formal exam marks are not ready for reports. These exam subjects still need submission: ${codes}.`,
    );
  }
  return tracking;
}

async function formalExamSectionForStudent(
  studentId: string,
  exam: ExamRow,
): Promise<ReportFormalExamSection> {
  const maxScore = Number(exam.max_score);
  const { rows } = await query<{
    subject_name: string;
    subject_code: string;
    score: string;
    grade: string | null;
    points: number | null;
  }>(
    `SELECT s.name AS subject_name, s.code AS subject_code,
            em.score::text AS score, em.grade, em.points
     FROM exam_subjects es
     JOIN subjects s ON s.id = es.subject_id
     LEFT JOIN exam_marks em
       ON em.exam_id = es.exam_id
      AND em.subject_id = es.subject_id
      AND em.student_id = $2
     WHERE es.exam_id = $1
     ORDER BY s.code`,
    [exam.id, studentId],
  );

  const { rows: classRow } = await query<{ level: string }>(
    `SELECT level FROM classes WHERE id = $1`,
    [exam.class_id],
  );
  const level = classRow[0]?.level === "A_LEVEL" ? "A_LEVEL" : "O_LEVEL";

  const subjects: ReportFormalExamSection["subjects"] = [];
  for (const r of rows) {
    if (r.score == null) continue;
    const score = Number(r.score);
    if (Number.isNaN(score)) continue;
    let grade = r.grade ?? "";
    let points = r.points;
    if (!grade || points == null) {
      const resolved = await resolveConfiguredGrade(score, level);
      grade = resolved.grade;
      points = resolved.points;
    }
    subjects.push({
      name: r.subject_name,
      code: r.subject_code,
      score,
      grade,
      points: points != null ? Number(points) : null,
      maxScore,
    });
  }

  return {
    examId: exam.id,
    examName: exam.name,
    maxScore,
    subjects,
  };
}

export async function compileAlevelReportFromExam(
  studentId: string,
  termId: string,
  academicYearId: string,
  exam: ExamRow,
): Promise<AlevelReportPayload> {
  const formal = await formalExamSectionForStudent(studentId, exam);
  if (formal.subjects.length === 0) {
    const base = await compileAlevelReportPayload(studentId, termId, academicYearId);
    return {
      ...base,
      subjects: [],
      totalPoints: 0,
      division: "Incomplete",
      sourceExamId: exam.id,
      sourceExamName: exam.name,
    };
  }

  const pointValues = formal.subjects
    .map((s) => s.points)
    .filter((p): p is number => p != null && !Number.isNaN(p));
  const { totalPoints, division } = computeAlevelAggregate(pointValues);

  const base = await compileAlevelReportPayload(studentId, termId, academicYearId);

  return {
    ...base,
    subjects: formal.subjects.map((s) => ({
      name: s.name,
      code: s.code,
      score: s.score,
      grade: s.grade,
      points: Number(s.points ?? 0),
    })),
    totalPoints,
    division,
    sourceExamId: exam.id,
    sourceExamName: exam.name,
  };
}

export async function compileCbcReportWithExam(
  studentId: string,
  termId: string,
  academicYearId: string,
  exam: ExamRow,
): Promise<CbcReportPayload> {
  const payload = await compileCbcReportPayload(studentId, termId, academicYearId);
  const formal = await formalExamSectionForStudent(studentId, exam);
  if (formal.subjects.length > 0) {
    payload.formalExam = formal;
  }
  return payload;
}
