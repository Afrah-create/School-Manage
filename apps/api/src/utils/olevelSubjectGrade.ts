import {
  DEFAULT_ASSESSMENT_GRADING_SCALES,
  finalOLevelSubjectGrade,
} from "@uganda-cbc-sms/shared";
import { query } from "../config/db";
import { activeTenantIdFromContext } from "./activeTenant.js";
import { loadAssessmentConfig } from "./assessmentConfig";
import { loadActiveGradingBands } from "./gradingScales";
import {
  loadProjectCompleteBySubject,
  OLEVEL_FORMULA_VERSION,
  resolveSubjectCa,
} from "./olevelCaLoader";
import { recomputeOlevelCertification } from "../modules/assessments/olevelCertification.service";

async function loadEocScores(
  studentId: string,
  academicYearId: string,
): Promise<Map<string, number>> {
  const { rows } = await query<{ subject_id: string; subject_code: string; score: string; max_score: string }>(
    `SELECT sub.id AS subject_id, sub.code AS subject_code,
            em.score::text AS score, e.max_score::text AS max_score
     FROM exam_marks em
     JOIN exams e ON e.id = em.exam_id
     JOIN subjects sub ON sub.id = em.subject_id
     WHERE em.student_id = $1
       AND e.academic_year_id = $2
       AND e.status IN ('open', 'closed')
     ORDER BY sub.code, e.exam_date DESC NULLS LAST`,
    [studentId, academicYearId],
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    const code = row.subject_code.toUpperCase();
    if (map.has(code)) continue;
    const max = Number(row.max_score) || 100;
    const pct = (Number(row.score) / max) * 100;
    if (!Number.isNaN(pct)) map.set(code, Math.round(pct * 100) / 100);
  }
  return map;
}

export type RecomputeOlevelOptions = {
  studentId?: string;
  academicYearId?: string;
  classId?: string;
  tenantId?: string;
  computedBy?: string | null;
};

export async function recomputeOlevelSubjectResults(
  studentId: string,
  academicYearId: string,
  tenantId?: string,
  computedBy?: string | null,
): Promise<{ updated: number }> {
  const tid = tenantId ?? activeTenantIdFromContext();
  const config = await loadAssessmentConfig(tid);
  const bands = await loadActiveGradingBands("O_LEVEL");
  const scaleRows =
    bands.length > 0
      ? bands
      : DEFAULT_ASSESSMENT_GRADING_SCALES.O_LEVEL.map((r) => ({ ...r, isActive: true }));

  const eocBySubject = await loadEocScores(studentId, academicYearId);
  const projectBySubject = await loadProjectCompleteBySubject(studentId, academicYearId, config);

  const { rows: subjectRows } = await query<{ id: string; code: string }>(
    `SELECT DISTINCT sub.id, sub.code
     FROM (
       SELECT subject_id FROM assessments_cbc WHERE student_id = $1 AND academic_year_id = $2
       UNION
       SELECT cs.subject_id
       FROM project_work_scores pws
       JOIN class_subjects cs ON cs.id = pws.class_subject_id
       WHERE pws.student_id = $1 AND cs.academic_year_id = $2
       UNION
       SELECT em.subject_id
       FROM exam_marks em
       JOIN exams e ON e.id = em.exam_id
       WHERE em.student_id = $1 AND e.academic_year_id = $2
     ) x
     JOIN subjects sub ON sub.id = x.subject_id`,
    [studentId, academicYearId],
  );

  const configSnapshot = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  let updated = 0;

  for (const sub of subjectRows) {
    const code = sub.code.toUpperCase();
    const ca = await resolveSubjectCa(studentId, sub.id, code, academicYearId, config);
    const eocScore = eocBySubject.get(code) ?? null;
    const useCaScore = ca.source === "project_work" ? ca.score : ca.source === "strand_fallback" ? ca.score : null;
    const { finalGrade, compositeScore } = finalOLevelSubjectGrade(
      useCaScore,
      eocScore,
      scaleRows,
      config,
    );
    const projectComplete = projectBySubject.get(code) ?? false;

    await query(
      `INSERT INTO olevel_subject_results (
         tenant_id, student_id, subject_id, academic_year_id,
         ca_score, eoc_score, composite_score, final_grade,
         ca_complete, project_complete, ca_source, formula_version,
         projects_completed, projects_expected, computed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
       ON CONFLICT (tenant_id, student_id, subject_id, academic_year_id) DO UPDATE SET
         ca_score = EXCLUDED.ca_score,
         eoc_score = EXCLUDED.eoc_score,
         composite_score = EXCLUDED.composite_score,
         final_grade = EXCLUDED.final_grade,
         ca_complete = EXCLUDED.ca_complete,
         project_complete = EXCLUDED.project_complete,
         ca_source = EXCLUDED.ca_source,
         formula_version = EXCLUDED.formula_version,
         projects_completed = EXCLUDED.projects_completed,
         projects_expected = EXCLUDED.projects_expected,
         computed_at = NOW()`,
      [
        tid,
        studentId,
        sub.id,
        academicYearId,
        useCaScore,
        eocScore,
        compositeScore,
        finalGrade,
        ca.complete,
        projectComplete,
        ca.source,
        OLEVEL_FORMULA_VERSION,
        ca.projectsCompleted,
        ca.projectsExpected,
      ],
    );

    await query(
      `INSERT INTO olevel_subject_result_versions (
         tenant_id, student_id, subject_id, academic_year_id,
         ca_score, eoc_score, composite_score, final_grade,
         ca_source, formula_version, projects_completed, projects_expected,
         ca_complete, project_complete, config_snapshot, computed_at, computed_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,NOW(),$16)`,
      [
        tid,
        studentId,
        sub.id,
        academicYearId,
        useCaScore,
        eocScore,
        compositeScore,
        finalGrade,
        ca.source,
        OLEVEL_FORMULA_VERSION,
        ca.projectsCompleted,
        ca.projectsExpected,
        ca.complete,
        projectComplete,
        JSON.stringify(configSnapshot),
        computedBy ?? null,
      ],
    );
    updated += 1;
  }

  await recomputeOlevelCertification(studentId, academicYearId, tid);
  return { updated };
}

export async function recomputeOlevelForClassYear(
  classId: string,
  academicYearId: string,
  tenantId?: string,
  computedBy?: string | null,
): Promise<{ students: number; updated: number }> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM students WHERE class_id = $1 AND status = 'active'`,
    [classId],
  );
  let updated = 0;
  for (const st of rows) {
    const r = await recomputeOlevelSubjectResults(st.id, academicYearId, tenantId, computedBy);
    updated += r.updated;
  }
  return { students: rows.length, updated };
}

export async function recalculateOlevelGrades(
  options: RecomputeOlevelOptions = {},
): Promise<{ scanned: number; updated: number }> {
  const where: string[] = ["st.status = 'active'"];
  const values: unknown[] = [];
  let i = 1;
  if (options.studentId) {
    where.push(`st.id = $${i++}`);
    values.push(options.studentId);
  }
  if (options.classId) {
    where.push(`st.class_id = $${i++}`);
    values.push(options.classId);
  }
  if (options.academicYearId) {
    where.push(`c.academic_year_id = $${i++}`);
    values.push(options.academicYearId);
  }

  const { rows } = await query<{ id: string; academic_year_id: string }>(
    `SELECT DISTINCT st.id, c.academic_year_id
     FROM students st
     JOIN classes c ON c.id = st.class_id
     WHERE ${where.join(" AND ")}`,
    values,
  );

  let updated = 0;
  for (const row of rows) {
    if (!row.academic_year_id) continue;
    const r = await recomputeOlevelSubjectResults(
      row.id,
      row.academic_year_id,
      options.tenantId,
      options.computedBy ?? null,
    );
    updated += r.updated;
  }
  return { scanned: rows.length, updated };
}
