import {
  computeOlevelCertification,
  OLEVEL_CERTIFICATION_LABELS,
  OLEVEL_CERTIFICATION_REASON_LABELS,
  type CaSource,
  type OlevelSubjectResultInput,
} from "@uganda-cbc-sms/shared";
import { query } from "../../config/db";
import { loadAssessmentConfig } from "../../utils/assessmentConfig";

export type OlevelCertificationStatus = {
  resultCode: "RESULT_1" | "RESULT_2" | "RESULT_3";
  reasonCodes: string[];
  label: string;
  reasonLabels: string[];
  computedAt: string;
};

export async function recomputeOlevelCertification(
  studentId: string,
  academicYearId: string,
  tenantId: string,
): Promise<OlevelCertificationStatus> {
  const config = await loadAssessmentConfig(tenantId);

  const { rows } = await query<{
    subject_code: string;
    ca_score: string | null;
    eoc_score: string | null;
    composite_score: string | null;
    final_grade: string | null;
    ca_complete: boolean;
    project_complete: boolean;
    ca_source: string | null;
    projects_completed: number | null;
    projects_expected: number | null;
  }>(
    `SELECT sub.code AS subject_code, osr.ca_score::text, osr.eoc_score::text,
            osr.composite_score::text, osr.final_grade, osr.ca_complete, osr.project_complete,
            osr.ca_source, osr.projects_completed, osr.projects_expected
     FROM olevel_subject_results osr
     JOIN subjects sub ON sub.id = osr.subject_id
     WHERE osr.student_id = $1 AND osr.academic_year_id = $2`,
    [studentId, academicYearId],
  );

  const subjects: OlevelSubjectResultInput[] = rows.map((r) => ({
    subjectCode: r.subject_code,
    caScore: r.ca_score != null ? Number(r.ca_score) : null,
    eocScore: r.eoc_score != null ? Number(r.eoc_score) : null,
    compositeScore: r.composite_score != null ? Number(r.composite_score) : null,
    finalGrade: (r.final_grade?.toUpperCase() as OlevelSubjectResultInput["finalGrade"]) ?? null,
    caComplete: r.ca_complete,
    caSource: (r.ca_source as CaSource | null) ?? null,
    projectComplete: r.project_complete,
    projectsCompleted: r.projects_completed ?? 0,
    projectsExpected: r.projects_expected ?? config.projectWork.expectedPerTerm,
  }));

  const result = computeOlevelCertification(subjects, config);

  const { rows: saved } = await query<{ computed_at: string }>(
    `INSERT INTO olevel_certification_status (
       tenant_id, student_id, academic_year_id, result_code, reason_codes, computed_at
     ) VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (tenant_id, student_id, academic_year_id) DO UPDATE SET
       result_code = EXCLUDED.result_code,
       reason_codes = EXCLUDED.reason_codes,
       computed_at = NOW()
     RETURNING computed_at`,
    [tenantId, studentId, academicYearId, result.resultCode, result.reasonCodes],
  );

  return {
    resultCode: result.resultCode,
    reasonCodes: result.reasonCodes,
    label: OLEVEL_CERTIFICATION_LABELS[result.resultCode] ?? result.resultCode,
    reasonLabels: result.reasonCodes.map(
      (c) => OLEVEL_CERTIFICATION_REASON_LABELS[c] ?? c,
    ),
    computedAt: new Date(saved[0]!.computed_at).toISOString(),
  };
}

export async function getOlevelCertification(
  studentId: string,
  academicYearId: string,
): Promise<OlevelCertificationStatus | null> {
  const { rows } = await query<{
    result_code: string;
    reason_codes: string[];
    computed_at: string;
  }>(
    `SELECT result_code, reason_codes, computed_at
     FROM olevel_certification_status
     WHERE student_id = $1 AND academic_year_id = $2
     LIMIT 1`,
    [studentId, academicYearId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    resultCode: row.result_code as OlevelCertificationStatus["resultCode"],
    reasonCodes: row.reason_codes ?? [],
    label: OLEVEL_CERTIFICATION_LABELS[row.result_code] ?? row.result_code,
    reasonLabels: (row.reason_codes ?? []).map(
      (c) => OLEVEL_CERTIFICATION_REASON_LABELS[c as keyof typeof OLEVEL_CERTIFICATION_REASON_LABELS] ?? c,
    ),
    computedAt: new Date(row.computed_at).toISOString(),
  };
}
