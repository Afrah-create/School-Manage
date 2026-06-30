import { query } from "../../config/db";
import { activeTenantIdFromContext } from "../../utils/activeTenant.js";
import { HttpError } from "../../utils/httpError";
import { loadActiveGradingBands, loadActiveLetterGradeDescriptorMap } from "../../utils/gradingScales";
import { recomputeTermSubjectResults } from "../../utils/termSubjectGrade";
import { listExamsForReportOptions } from "./reportExamLinkage";
import type { AlevelReportPayload, CbcReportPayload, GradingScaleLegendRow } from "./reportTypes";
import { REPORT_PAYLOAD_VERSION } from "./reportTypes";

const FALLBACK_SCHOOL_NAME = process.env.SCHOOL_NAME ?? "Uganda Secondary School";
const schoolNameCache = new Map<string, { name: string; atMs: number }>();

async function resolveSchoolName(tenantId?: string): Promise<string> {
  const tid = tenantId ?? activeTenantIdFromContext();
  const now = Date.now();
  const hit = schoolNameCache.get(tid);
  if (hit && now - hit.atMs < 60_000) return hit.name;
  try {
    const { rows } = await query<{ school_name: string }>(
      `SELECT school_name FROM tenant_settings WHERE tenant_id = $1 LIMIT 1`,
      [tid],
    );
    const name = rows[0]?.school_name?.trim() || FALLBACK_SCHOOL_NAME;
    schoolNameCache.set(tid, { name, atMs: now });
    return name;
  } catch {
    schoolNameCache.set(tid, { name: FALLBACK_SCHOOL_NAME, atMs: now });
    return FALLBACK_SCHOOL_NAME;
  }
}

export async function schoolDaysInRange(start: string, end: string): Promise<number> {
  const s = new Date(start);
  const e = new Date(end);
  let n = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) n++;
  }
  return Math.max(n, 1);
}

async function loadStudentContext(studentId: string, termId: string) {
  const { rows } = await query<{
    full_name: string;
    student_number: string;
    photo_url: string | null;
    class_id: string | null;
    class_name: string | null;
    class_stream: string | null;
    class_level: string | null;
    combination_code: string | null;
    combination_name: string | null;
    term_number: number;
    year_name: string;
    academic_year_id: string;
    term_start: string;
    term_end: string;
  }>(
    `SELECT s.full_name, s.student_number, s.photo_url, s.class_id,
            c.name AS class_name, c.stream AS class_stream, c.level AS class_level,
            sc.code AS combination_code, sc.name AS combination_name,
            t.term_number, ay.name AS year_name, ay.id AS academic_year_id,
            t.start_date AS term_start, t.end_date AS term_end
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN subject_combinations sc ON sc.id = s.combination_id
     JOIN terms t ON t.id = $2
     JOIN academic_years ay ON ay.id = t.academic_year_id
     WHERE s.id = $1`,
    [studentId, termId],
  );
  if (rows.length === 0) {
    throw new HttpError(404, "Student not found for this report.");
  }
  return rows[0]!;
}

export async function loadGradingLegend(): Promise<GradingScaleLegendRow[]> {
  const bands = await loadActiveGradingBands("O_LEVEL");
  return bands
    .filter((b) => b.isActive)
    .map((b) => ({
      minScore: b.minScore,
      maxScore: b.maxScore,
      grade: b.grade,
      descriptor: b.descriptor?.trim() || b.grade,
    }));
}

export async function compileCbcReportPayload(
  studentId: string,
  termId: string,
  _academicYearId: string,
  options?: { skipRecompute?: boolean },
): Promise<CbcReportPayload> {
  const st = await loadStudentContext(studentId, termId);
  const schoolName = await resolveSchoolName();

  if (!st.class_id) {
    throw new HttpError(400, "Student is not assigned to a class.");
  }

  if (!options?.skipRecompute) {
    await recomputeTermSubjectResults(studentId, termId);
  }

  const examOptions = await listExamsForReportOptions(st.class_id, termId);
  const examColumns = examOptions.map((e) => ({
    examId: e.id,
    name: e.name,
    examDate: e.examDate,
  }));
  const examOrder = examColumns.map((e) => e.examId);

  const descriptorMap = await loadActiveLetterGradeDescriptorMap();

  const { rows: termRows } = await query<{
    subject_code: string;
    subject_name: string;
    composite_score: string | null;
    exam_average: string | null;
    project_average: string | null;
    projects_completed: number | null;
    projects_expected: number | null;
    include_project_work: boolean;
    final_grade: string | null;
    exam_breakdown: unknown;
  }>(
    `SELECT sub.code AS subject_code, sub.name AS subject_name,
            tsr.composite_score::text, tsr.exam_average::text, tsr.project_average::text,
            tsr.projects_completed, tsr.projects_expected, tsr.include_project_work,
            tsr.final_grade, tsr.exam_breakdown
     FROM term_subject_results tsr
     JOIN subjects sub ON sub.id = tsr.subject_id
     JOIN class_subjects cs
       ON cs.subject_id = tsr.subject_id
      AND cs.class_id = $3
      AND cs.academic_year_id = (SELECT academic_year_id FROM terms WHERE id = $2)
      AND cs.include_on_reports = true
     WHERE tsr.student_id = $1 AND tsr.term_id = $2
     ORDER BY sub.code`,
    [studentId, termId, st.class_id],
  );

  const termSubjectRows = termRows.map((r) => {
    const breakdown = Array.isArray(r.exam_breakdown)
      ? (r.exam_breakdown as Array<{
          examId: string;
          scorePct: number;
          teacherInitial?: string | null;
        }>)
      : [];
    const scoreByExam = new Map(breakdown.map((b) => [b.examId, b.scorePct]));
    const examScores = examOrder.map((id) => scoreByExam.get(id) ?? null);
    const grade = r.final_grade?.toUpperCase() ?? null;
    const descriptor =
      grade && descriptorMap[grade as keyof typeof descriptorMap]
        ? descriptorMap[grade as keyof typeof descriptorMap]
        : grade ?? "—";
    const initials = breakdown
      .map((b) => b.teacherInitial)
      .filter((x): x is string => Boolean(x));
    const teacherInitial = initials.length > 0 ? initials[initials.length - 1]! : null;

    return {
      code: r.subject_code,
      name: r.subject_name,
      examScores,
      examAverage: r.exam_average != null ? Number(r.exam_average) : null,
      projectAverage: r.project_average != null ? Number(r.project_average) : null,
      projectsCompleted: r.projects_completed,
      projectsExpected: r.projects_expected,
      includeProjectWork: Boolean(r.include_project_work),
      average: r.composite_score != null ? Number(r.composite_score) : null,
      finalGrade: grade,
      descriptor,
      teacherInitial,
    };
  });

  const averages = termSubjectRows
    .map((r) => r.average)
    .filter((a): a is number => a != null && !Number.isNaN(a));
  const overallAverage =
    averages.length > 0
      ? Math.round((averages.reduce((s, v) => s + v, 0) / averages.length) * 100) / 100
      : null;
  const overallTotal =
    averages.length > 0
      ? Math.round(averages.reduce((s, v) => s + v, 0) * 100) / 100
      : null;

  const { rows: comments } = await query<{
    class_teacher_comment: string | null;
    headteacher_comment: string | null;
  }>(
    `SELECT class_teacher_comment, headteacher_comment
     FROM assessment_comments
     WHERE student_id = $1 AND term_id = $2 AND academic_year_id = $3`,
    [studentId, termId, st.academic_year_id],
  );

  const { rows: legacy } = await query<{
    teacher_comment: string | null;
    headteacher_comment: string | null;
  }>(
    `SELECT teacher_comment, headteacher_comment FROM cbc_report_cards
     WHERE student_id = $1 AND term_id = $2`,
    [studentId, termId],
  );

  const att = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM attendance
     WHERE student_id = $1 AND date >= $2::date AND date <= $3::date AND status = 'present'`,
    [studentId, st.term_start, st.term_end],
  );
  const daysAttended = Number(att.rows[0]?.c ?? 0);
  const totalDays = await schoolDaysInRange(st.term_start, st.term_end);

  const commentRow = comments[0];
  const legacyRow = legacy[0];
  const gradingScaleLegend = await loadGradingLegend();

  return {
    version: REPORT_PAYLOAD_VERSION,
    schoolName,
    studentName: st.full_name,
    studentNumber: st.student_number,
    className: st.class_name ?? "",
    stream: st.class_stream ?? "",
    termLabel: `Term ${st.term_number}`,
    yearName: st.year_name,
    photoUrl: st.photo_url,
    subjects: [],
    examColumns,
    termSubjectRows,
    overallTotal,
    overallAverage,
    gradingScaleLegend,
    daysAttended,
    totalDays,
    teacherComment:
      commentRow?.class_teacher_comment?.trim() ||
      legacyRow?.teacher_comment?.trim() ||
      "",
    headteacherComment:
      commentRow?.headteacher_comment?.trim() ||
      legacyRow?.headteacher_comment?.trim() ||
      "",
  };
}

export async function compileAlevelReportPayload(
  studentId: string,
  termId: string,
  academicYearId: string,
): Promise<AlevelReportPayload> {
  const { computeAlevelAggregate } = await import("../../utils/alevelDivision.js");
  const { resolveConfiguredGrade } = await import("../../utils/gradingScales.js");

  const st = await loadStudentContext(studentId, termId);
  const schoolName = await resolveSchoolName();

  const { rows: scoreRows } = await query<{
    subject_id: string;
    subject_name: string;
    subject_code: string;
    score: string;
    grade: string | null;
    points: number | null;
  }>(
    `SELECT aa.subject_id, sub.name AS subject_name, sub.code AS subject_code,
            aa.score::text AS score, aa.grade, aa.points
     FROM assessments_alevel aa
     JOIN subjects sub ON sub.id = aa.subject_id
     WHERE aa.student_id = $1 AND aa.term_id = $2 AND aa.academic_year_id = $3
     ORDER BY sub.code`,
    [studentId, termId, academicYearId],
  );

  const subjects: AlevelReportPayload["subjects"] = [];
  const pointValues: number[] = [];

  for (const row of scoreRows) {
    const score = Number(row.score);
    if (Number.isNaN(score)) continue;
    let grade = row.grade ?? "";
    let points = row.points;
    if (!grade || points == null) {
      const resolved = await resolveConfiguredGrade(score, "A_LEVEL");
      grade = resolved.grade;
      points = resolved.points;
      await query(
        `UPDATE assessments_alevel SET grade = $2, points = $3, updated_at = NOW()
         WHERE student_id = $1 AND subject_id = $4 AND term_id = $5 AND academic_year_id = $6`,
        [studentId, grade, points, row.subject_id, termId, academicYearId],
      );
    }
    subjects.push({
      name: row.subject_name,
      code: row.subject_code,
      score,
      grade,
      points: Number(points),
    });
    pointValues.push(Number(points));
  }

  const { totalPoints, division } = computeAlevelAggregate(pointValues);

  const { rows: comments } = await query<{
    class_teacher_comment: string | null;
    headteacher_remark: string | null;
  }>(
    `SELECT class_teacher_comment, headteacher_remark
     FROM assessment_alevel_comments
     WHERE student_id = $1 AND term_id = $2 AND academic_year_id = $3`,
    [studentId, termId, academicYearId],
  );

  const { rows: legacy } = await query<{
    teacher_comment: string | null;
    headteacher_remark: string | null;
  }>(
    `SELECT teacher_comment, headteacher_remark FROM alevel_results
     WHERE student_id = $1 AND term_id = $2`,
    [studentId, termId],
  );

  const commentRow = comments[0];
  const legacyRow = legacy[0];

  return {
    version: REPORT_PAYLOAD_VERSION,
    schoolName,
    studentName: st.full_name,
    studentNumber: st.student_number,
    className: st.class_name ?? "",
    combination: st.combination_code ?? st.combination_name ?? "",
    termLabel: `Term ${st.term_number}`,
    yearName: st.year_name,
    photoUrl: st.photo_url,
    subjects,
    totalPoints,
    division,
    teacherComment:
      commentRow?.class_teacher_comment?.trim() ||
      legacyRow?.teacher_comment?.trim() ||
      "",
    headteacherRemark:
      commentRow?.headteacher_remark?.trim() ||
      legacyRow?.headteacher_remark?.trim() ||
      "",
  };
}
