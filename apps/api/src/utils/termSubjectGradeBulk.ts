import {
  computeTermSubjectGrade,
  DEFAULT_ASSESSMENT_GRADING_SCALES,
  TERM_FORMULA_VERSION,
  type TermExamMarksInput,
} from "@uganda-cbc-sms/shared";
import { query } from "../config/db";
import { activeTenantIdFromContext } from "./activeTenant";
import { loadAssessmentConfig } from "./assessmentConfig";
import { loadActiveGradingBands } from "./gradingScales";
import { BULK_CHUNK_SIZE } from "./bulkConstants";

type ExamMarkRow = {
  student_id: string;
  subject_id: string;
  exam_id: string;
  exam_name: string;
  score: string;
  max_score: string;
  is_compulsory: boolean;
  teacher_initial: string | null;
};

type ProjectScoreRow = {
  student_id: string;
  subject_id: string;
  score: string;
  max_score: string;
};

type UpsertRow = {
  studentId: string;
  subjectId: string;
  examAverage: number | null;
  projectAverage: number | null;
  compositeScore: number | null;
  finalGrade: string | null;
  examBreakdown: string;
  projectsCompleted: number;
  projectsExpected: number;
  includeProjectWork: boolean;
};

/**
 * Recompute term_subject_results for every active student in a class in bulk
 * (one marks query + chunked UNNEST upserts instead of per-student loops).
 */
export async function recomputeTermSubjectResultsForClass(
  classId: string,
  termId: string,
  tenantId?: string,
): Promise<{ students: number; updated: number }> {
  const tid = tenantId ?? activeTenantIdFromContext();

  const { rows: students } = await query<{ id: string }>(
    `SELECT id FROM students WHERE class_id = $1 AND status = 'active'`,
    [classId],
  );
  if (students.length === 0) return { students: 0, updated: 0 };

  const { rows: yearRows } = await query<{ academic_year_id: string }>(
    `SELECT academic_year_id FROM terms WHERE id = $1`,
    [termId],
  );
  const academicYearId = yearRows[0]?.academic_year_id;
  if (!academicYearId) return { students: students.length, updated: 0 };

  const [config, bands, examMarkRows, projectRows, classSubjectRows] = await Promise.all([
    loadAssessmentConfig(tid),
    loadActiveGradingBands("O_LEVEL"),
    query<ExamMarkRow>(
      `SELECT em.student_id, em.subject_id, e.id AS exam_id, e.name AS exam_name,
              em.score::text AS score, e.max_score::text AS max_score,
              es.is_compulsory,
              NULLIF(UPPER(LEFT(COALESCE(u.full_name, ''), 1)), '') AS teacher_initial
       FROM exam_marks em
       JOIN exams e ON e.id = em.exam_id AND e.deleted_at IS NULL
       JOIN exam_subjects es ON es.exam_id = em.exam_id AND es.subject_id = em.subject_id
       JOIN students st ON st.id = em.student_id AND st.class_id = $1 AND st.status = 'active'
       LEFT JOIN users u ON u.id = em.teacher_id
       WHERE e.term_id = $2 AND e.status IN ('open', 'closed')
       ORDER BY em.student_id, e.exam_date ASC NULLS LAST, e.name ASC`,
      [classId, termId],
    ).then((r) => r.rows),
    query<ProjectScoreRow>(
      `SELECT pws.student_id, cs.subject_id, pws.score::text AS score, pws.max_score::text AS max_score
       FROM project_work_scores pws
       JOIN class_subjects cs ON cs.id = pws.class_subject_id
       JOIN students st ON st.id = pws.student_id AND st.class_id = $1 AND st.status = 'active'
       WHERE pws.term_id = $2`,
      [classId, termId],
    ).then((r) => r.rows),
    query<{ subject_id: string; project_work_required: boolean }>(
      `SELECT subject_id, project_work_required
       FROM class_subjects
       WHERE class_id = $1 AND academic_year_id = $2`,
      [classId, academicYearId],
    ).then((r) => r.rows),
  ]);

  const scaleRows =
    bands.length > 0
      ? bands
      : DEFAULT_ASSESSMENT_GRADING_SCALES.O_LEVEL.map((r) => ({ ...r, isActive: true }));

  const projectWorkBySubject = new Map(
    classSubjectRows.map((r) => [r.subject_id, Boolean(r.project_work_required)]),
  );

  const marksByStudentSubject = new Map<string, TermExamMarksInput[]>();
  for (const r of examMarkRows) {
    const key = `${r.student_id}:${r.subject_id}`;
    const list = marksByStudentSubject.get(key) ?? [];
    list.push({
      examId: r.exam_id,
      examName: r.exam_name,
      score: Number(r.score),
      maxScore: Number(r.max_score) || 100,
      isCompulsory: r.is_compulsory,
      teacherInitial: r.teacher_initial,
    });
    marksByStudentSubject.set(key, list);
  }

  const projectsByStudentSubject = new Map<string, Array<{ score: number; maxScore: number }>>();
  for (const r of projectRows) {
    const key = `${r.student_id}:${r.subject_id}`;
    const list = projectsByStudentSubject.get(key) ?? [];
    list.push({ score: Number(r.score), maxScore: Number(r.max_score) || 100 });
    projectsByStudentSubject.set(key, list);
  }

  const subjectPairs = new Set<string>();
  for (const key of marksByStudentSubject.keys()) subjectPairs.add(key);
  for (const key of projectsByStudentSubject.keys()) subjectPairs.add(key);

  const upserts: UpsertRow[] = [];
  for (const key of subjectPairs) {
    const [studentId, subjectId] = key.split(":");
    if (!studentId || !subjectId) continue;
    const examMarks = marksByStudentSubject.get(key) ?? [];
    const projectScores = projectsByStudentSubject.get(key) ?? [];
    const projectWorkRequired = projectWorkBySubject.get(subjectId) ?? false;
    const effectiveConfig = {
      ...config,
      includeProjectWorkInTermGrade: config.includeProjectWorkInTermGrade && projectWorkRequired,
    };
    const result = computeTermSubjectGrade(
      { examMarks, projectScores, config: effectiveConfig },
      scaleRows,
    );
    if (result.compositeScore == null && result.examAverage == null) continue;
    upserts.push({
      studentId,
      subjectId,
      examAverage: result.examAverage,
      projectAverage: result.projectAverage,
      compositeScore: result.compositeScore,
      finalGrade: result.finalGrade,
      examBreakdown: JSON.stringify(result.examBreakdown),
      projectsCompleted: result.projectsCompleted,
      projectsExpected: result.projectsExpected,
      includeProjectWork: result.includeProjectWork,
    });
  }

  let updated = 0;
  for (let i = 0; i < upserts.length; i += BULK_CHUNK_SIZE) {
    const chunk = upserts.slice(i, i + BULK_CHUNK_SIZE);
    const studentIds = chunk.map((r) => r.studentId);
    const subjectIds = chunk.map((r) => r.subjectId);
    const examAvgs = chunk.map((r) => r.examAverage);
    const projectAvgs = chunk.map((r) => r.projectAverage);
    const composites = chunk.map((r) => r.compositeScore);
    const grades = chunk.map((r) => r.finalGrade);
    const breakdowns = chunk.map((r) => r.examBreakdown);
    const completed = chunk.map((r) => r.projectsCompleted);
    const expected = chunk.map((r) => r.projectsExpected);
    const includePw = chunk.map((r) => r.includeProjectWork);

    const result = await query(
      `INSERT INTO term_subject_results (
         tenant_id, student_id, subject_id, term_id,
         exam_average, project_average, composite_score, final_grade,
         exam_breakdown, projects_completed, projects_expected,
         include_project_work, formula_version, computed_at
       )
       SELECT $1, u.student_id, u.subject_id, $2,
              u.exam_average, u.project_average, u.composite_score, u.final_grade,
              u.exam_breakdown::jsonb, u.projects_completed, u.projects_expected,
              u.include_project_work, $3, NOW()
       FROM UNNEST(
         $4::uuid[], $5::uuid[], $6::numeric[], $7::numeric[], $8::numeric[],
         $9::text[], $10::text[], $11::int[], $12::int[], $13::bool[]
       ) AS u(
         student_id, subject_id, exam_average, project_average, composite_score,
         final_grade, exam_breakdown, projects_completed, projects_expected, include_project_work
       )
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
        termId,
        TERM_FORMULA_VERSION,
        studentIds,
        subjectIds,
        examAvgs,
        projectAvgs,
        composites,
        grades,
        breakdowns,
        completed,
        expected,
        includePw,
      ],
    );
    updated += result.rowCount ?? chunk.length;
  }

  return { students: students.length, updated };
}
