import {
  computeTermSubjectGrade,
  DEFAULT_ASSESSMENT_GRADING_SCALES,
  DEFAULT_ASSESSMENT_CONFIG,
  TERM_FORMULA_VERSION,
  type TermExamMarksInput,
} from "@uganda-cbc-sms/shared";
import { query } from "../config/db";
import { activeTenantIdFromContext } from "./activeTenant";
import { loadAssessmentConfig } from "./assessmentConfig";
import { loadActiveGradingBands } from "./gradingScales";

export type TermExamMarkRow = TermExamMarksInput & {
  subjectId: string;
};

async function loadTermExamMarksForStudent(
  studentId: string,
  termId: string,
  subjectId?: string,
): Promise<TermExamMarkRow[]> {
  const values: unknown[] = [studentId, termId];
  let subjectFilter = "";
  if (subjectId) {
    values.push(subjectId);
    subjectFilter = ` AND em.subject_id = $${values.length}`;
  }

  const { rows } = await query<{
    subject_id: string;
    exam_id: string;
    exam_name: string;
    score: string;
    max_score: string;
    is_compulsory: boolean;
    teacher_initial: string | null;
  }>(
    `SELECT em.subject_id, e.id AS exam_id, e.name AS exam_name,
            em.score::text AS score, e.max_score::text AS max_score,
            es.is_compulsory,
            NULLIF(UPPER(LEFT(COALESCE(u.full_name, ''), 1)), '') AS teacher_initial
     FROM exam_marks em
     JOIN exams e ON e.id = em.exam_id AND e.deleted_at IS NULL
     JOIN exam_subjects es ON es.exam_id = em.exam_id AND es.subject_id = em.subject_id
     LEFT JOIN users u ON u.id = em.teacher_id
     WHERE em.student_id = $1
       AND e.term_id = $2
       AND e.status IN ('open', 'closed')
       ${subjectFilter}
     ORDER BY e.exam_date ASC NULLS LAST, e.name ASC`,
    values,
  );

  return rows.map((r) => ({
    subjectId: r.subject_id,
    examId: r.exam_id,
    examName: r.exam_name,
    score: Number(r.score),
    maxScore: Number(r.max_score) || 100,
    isCompulsory: r.is_compulsory,
    teacherInitial: r.teacher_initial,
  }));
}

async function loadTermProjectScoresForStudent(
  studentId: string,
  subjectId: string,
  termId: string,
): Promise<Array<{ score: number; maxScore: number }>> {
  const { rows } = await query<{ score: string; max_score: string }>(
    `SELECT pws.score::text, pws.max_score::text
     FROM project_work_scores pws
     JOIN class_subjects cs ON cs.id = pws.class_subject_id
     WHERE pws.student_id = $1
       AND cs.subject_id = $2
       AND pws.term_id = $3
     ORDER BY pws.project_number`,
    [studentId, subjectId, termId],
  );
  return rows.map((r) => ({
    score: Number(r.score),
    maxScore: Number(r.max_score) || 100,
  }));
}

async function subjectIdsWithTermData(
  studentId: string,
  termId: string,
): Promise<string[]> {
  const { rows } = await query<{ subject_id: string }>(
    `SELECT DISTINCT subject_id FROM (
       SELECT em.subject_id
       FROM exam_marks em
       JOIN exams e ON e.id = em.exam_id AND e.deleted_at IS NULL
       WHERE em.student_id = $1 AND e.term_id = $2 AND e.status IN ('open', 'closed')
       UNION
       SELECT cs.subject_id
       FROM project_work_scores pws
       JOIN class_subjects cs ON cs.id = pws.class_subject_id
       WHERE pws.student_id = $1 AND pws.term_id = $2
     ) x`,
    [studentId, termId],
  );
  return rows.map((r) => r.subject_id);
}

async function loadClassSubjectProjectWorkRequired(
  classId: string,
  subjectId: string,
  academicYearId: string,
): Promise<boolean> {
  const { rows } = await query<{ project_work_required: boolean }>(
    `SELECT project_work_required
     FROM class_subjects
     WHERE class_id = $1 AND subject_id = $2 AND academic_year_id = $3
     LIMIT 1`,
    [classId, subjectId, academicYearId],
  );
  return Boolean(rows[0]?.project_work_required);
}

async function loadStudentClassAndYear(
  studentId: string,
  termId: string,
): Promise<{ classId: string; academicYearId: string } | null> {
  const { rows } = await query<{ class_id: string; academic_year_id: string }>(
    `SELECT st.class_id, t.academic_year_id
     FROM students st
     JOIN terms t ON t.id = $2
     JOIN classes c ON c.id = st.class_id AND c.academic_year_id = t.academic_year_id
     WHERE st.id = $1
     LIMIT 1`,
    [studentId, termId],
  );
  const row = rows[0];
  if (!row?.class_id) return null;
  return { classId: row.class_id, academicYearId: row.academic_year_id };
}

export async function recomputeTermSubjectResults(
  studentId: string,
  termId: string,
  tenantId?: string,
): Promise<{ updated: number }> {
  const tid = tenantId ?? activeTenantIdFromContext();
  const config = await loadAssessmentConfig(tid);
  const studentCtx = await loadStudentClassAndYear(studentId, termId);
  const bands = await loadActiveGradingBands("O_LEVEL");
  const scaleRows =
    bands.length > 0
      ? bands
      : DEFAULT_ASSESSMENT_GRADING_SCALES.O_LEVEL.map((r) => ({ ...r, isActive: true }));

  const allMarks = await loadTermExamMarksForStudent(studentId, termId);
  const marksBySubject = new Map<string, TermExamMarksInput[]>();
  for (const m of allMarks) {
    const list = marksBySubject.get(m.subjectId) ?? [];
    list.push({
      examId: m.examId,
      examName: m.examName,
      score: m.score,
      maxScore: m.maxScore,
      isCompulsory: m.isCompulsory,
      teacherInitial: m.teacherInitial,
    });
    marksBySubject.set(m.subjectId, list);
  }

  const subjectIds = await subjectIdsWithTermData(studentId, termId);
  let updated = 0;

  for (const subjectId of subjectIds) {
    const examMarks = marksBySubject.get(subjectId) ?? [];
    const projectScores = await loadTermProjectScoresForStudent(studentId, subjectId, termId);
    const projectWorkRequired =
      studentCtx != null
        ? await loadClassSubjectProjectWorkRequired(
            studentCtx.classId,
            subjectId,
            studentCtx.academicYearId,
          )
        : false;
    const effectiveConfig = {
      ...config,
      includeProjectWorkInTermGrade:
        config.includeProjectWorkInTermGrade && projectWorkRequired,
    };
    const result = computeTermSubjectGrade(
      { examMarks, projectScores, config: effectiveConfig },
      scaleRows,
    );

    if (result.compositeScore == null && result.examAverage == null) continue;

    await query(
      `INSERT INTO term_subject_results (
         tenant_id, student_id, subject_id, term_id,
         exam_average, project_average, composite_score, final_grade,
         exam_breakdown, projects_completed, projects_expected,
         include_project_work, formula_version, computed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,NOW())
       ON CONFLICT (tenant_id, student_id, subject_id, term_id) DO UPDATE SET
         exam_average = EXCLUDED.exam_average,
         project_average = EXCLUDED.project_average,
         composite_score = EXCLUDED.composite_score,
         final_grade = EXCLUDED.final_grade,
         exam_breakdown = EXCLUDED.exam_breakdown,
         projects_completed = EXCLUDED.projects_completed,
         projects_expected = EXCLUDED.projects_expected,
         include_project_work = EXCLUDED.include_project_work,
         formula_version = EXCLUDED.formula_version,
         computed_at = NOW()`,
      [
        tid,
        studentId,
        subjectId,
        termId,
        result.examAverage,
        result.projectAverage,
        result.compositeScore,
        result.finalGrade,
        JSON.stringify(result.examBreakdown),
        result.projectsCompleted,
        result.projectsExpected,
        result.includeProjectWork,
        TERM_FORMULA_VERSION,
      ],
    );
    updated += 1;
  }

  return { updated };
}

export async function recomputeTermForClass(
  classId: string,
  termId: string,
  tenantId?: string,
): Promise<{ students: number; updated: number }> {
  const { recomputeTermSubjectResultsForClass } = await import("./termSubjectGradeBulk.js");
  return recomputeTermSubjectResultsForClass(classId, termId, tenantId);
}

export async function recalculateTermGrades(options: {
  classId?: string;
  termId: string;
  studentId?: string;
  tenantId?: string;
}): Promise<{ scanned: number; updated: number }> {
  if (!options.termId) {
    return { scanned: 0, updated: 0 };
  }

  if (options.studentId) {
    const r = await recomputeTermSubjectResults(
      options.studentId,
      options.termId,
      options.tenantId,
    );
    return { scanned: 1, updated: r.updated };
  }

  if (options.classId) {
    const r = await recomputeTermForClass(options.classId, options.termId, options.tenantId);
    return { scanned: r.students, updated: r.updated };
  }

  const { rows } = await query<{ id: string }>(
    `SELECT DISTINCT st.id
     FROM students st
     JOIN classes c ON c.id = st.class_id
     JOIN terms t ON t.id = $1 AND t.academic_year_id = c.academic_year_id
     WHERE st.status = 'active'`,
    [options.termId],
  );

  let updated = 0;
  for (const row of rows) {
    const r = await recomputeTermSubjectResults(row.id, options.termId, options.tenantId);
    updated += r.updated;
  }
  return { scanned: rows.length, updated };
}

export { loadTermExamMarksForStudent };
