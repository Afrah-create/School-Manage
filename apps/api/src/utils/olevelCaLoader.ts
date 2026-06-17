import {
  ca_score_for,
  computeProjectsExpected,
  finalOLevelSubjectGrade,
  OLEVEL_FORMULA_VERSION,
  resolveWindowForms,
  type AssessmentConfig,
  type ProjectScoreRow,
  type StrandRating,
} from "@uganda-cbc-sms/shared";
import { query } from "../config/db";

export type YearWindowRow = {
  id: string;
  curriculumForm: string | null;
};

/** Academic years in the configured CA window relative to the reporting year. */
export async function resolveCaYearIds(
  reportingYearId: string,
  config: AssessmentConfig,
): Promise<{ yearIds: string[]; termCount: number }> {
  const forms = resolveWindowForms(config);
  const { rows: reporting } = await query<{ curriculum_form: string | null; start_date: string }>(
    `SELECT curriculum_form, start_date::text FROM academic_years WHERE id = $1`,
    [reportingYearId],
  );
  if (!reporting[0]) return { yearIds: [reportingYearId], termCount: 3 };

  const { rows: allYears } = await query<{
    id: string;
    curriculum_form: string | null;
    start_date: string;
  }>(
    `SELECT id, curriculum_form, start_date::text
     FROM academic_years
     ORDER BY start_date ASC`,
  );

  const withForm = allYears.filter((y) => y.curriculum_form && forms.includes(y.curriculum_form as never));
  let yearIds: string[];
  if (withForm.length > 0) {
    yearIds = withForm.map((y) => y.id);
  } else {
    yearIds = [reportingYearId];
  }

  const { rows: termRows } = await query<{ c: string }>(
    `SELECT COUNT(DISTINCT t.id)::text AS c
     FROM terms t
     WHERE t.academic_year_id = ANY($1::uuid[])`,
    [yearIds],
  );
  const termCount = Math.max(1, Number(termRows[0]?.c ?? 3));
  return { yearIds, termCount };
}

export async function loadProjectScoresForSubject(
  studentId: string,
  subjectId: string,
  yearIds: string[],
): Promise<ProjectScoreRow[]> {
  const { rows } = await query<{
    score: string;
    max_score: string;
    term_id: string;
    project_number: number;
  }>(
    `SELECT pws.score::text, pws.max_score::text, pws.term_id::text, pws.project_number
     FROM project_work_scores pws
     JOIN class_subjects cs ON cs.id = pws.class_subject_id
     WHERE pws.student_id = $1
       AND cs.subject_id = $2
       AND cs.academic_year_id = ANY($3::uuid[])
     ORDER BY pws.term_id, pws.project_number`,
    [studentId, subjectId, yearIds],
  );
  return rows.map((r) => ({
    score: Number(r.score),
    maxScore: Number(r.max_score) || 100,
    termId: r.term_id,
    projectNumber: r.project_number,
  }));
}

export async function loadStrandRatingsForSubject(
  studentId: string,
  subjectId: string,
  yearIds: string[],
): Promise<StrandRating[]> {
  const { rows } = await query<{ strand: string; rating: string }>(
    `SELECT ac.strand, ac.rating
     FROM assessments_cbc ac
     WHERE ac.student_id = $1
       AND ac.subject_id = $2
       AND ac.academic_year_id = ANY($3::uuid[])`,
    [studentId, subjectId, yearIds],
  );
  return rows.map((r) => ({ strand: r.strand, rating: r.rating }));
}

export async function resolveSubjectCa(
  studentId: string,
  subjectId: string,
  subjectCode: string,
  reportingYearId: string,
  config: AssessmentConfig,
) {
  const { yearIds, termCount } = await resolveCaYearIds(reportingYearId, config);
  const projectsExpected = computeProjectsExpected(config, termCount);
  const projectScores = await loadProjectScoresForSubject(studentId, subjectId, yearIds);
  const strandRatings = await loadStrandRatingsForSubject(studentId, subjectId, yearIds);
  return ca_score_for({
    projectScores,
    strandRatings,
    projectsExpected,
    config,
    subjectCode,
  });
}

export async function loadProjectCompleteBySubject(
  studentId: string,
  academicYearId: string,
  config: AssessmentConfig,
): Promise<Map<string, boolean>> {
  const { yearIds } = await resolveCaYearIds(academicYearId, config);
  const { rows } = await query<{ subject_code: string; cnt: string; expected: string }>(
    `SELECT sub.code AS subject_code,
            COUNT(pws.id)::text AS cnt
     FROM project_work_scores pws
     JOIN class_subjects cs ON cs.id = pws.class_subject_id
     JOIN subjects sub ON sub.id = cs.subject_id
     WHERE pws.student_id = $1
       AND cs.academic_year_id = ANY($2::uuid[])
     GROUP BY sub.code`,
    [studentId, yearIds],
  );
  const { termCount } = await resolveCaYearIds(academicYearId, config);
  const expected = computeProjectsExpected(config, termCount);
  const map = new Map<string, boolean>();
  for (const r of rows) {
    map.set(r.subject_code.toUpperCase(), Number(r.cnt) >= expected);
  }
  return map;
}

export { OLEVEL_FORMULA_VERSION, finalOLevelSubjectGrade };
