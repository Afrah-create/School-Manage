import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { getCbcDescriptor } from "../../utils/grading";
import { computeAlevelAggregate } from "../../utils/alevelDivision";
import { resolveConfiguredGrade } from "../../utils/gradingScales";
import type { AlevelReportPayload, CbcReportPayload } from "./reportTypes";
import { REPORT_PAYLOAD_VERSION } from "./reportTypes";

const schoolName = process.env.SCHOOL_NAME ?? "Uganda Secondary School";

async function schoolDaysInRange(start: string, end: string): Promise<number> {
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

export async function compileCbcReportPayload(
  studentId: string,
  termId: string,
  academicYearId: string,
): Promise<CbcReportPayload> {
  const st = await loadStudentContext(studentId, termId);

  const { rows: scores } = await query<{
    subject_name: string;
    subject_code: string;
    strand: string;
    competency: string;
    rating: string;
  }>(
    `SELECT sub.name AS subject_name, sub.code AS subject_code,
            ac.strand, ac.competency, ac.rating
     FROM assessments_cbc ac
     JOIN subjects sub ON sub.id = ac.subject_id
     WHERE ac.student_id = $1 AND ac.term_id = $2 AND ac.academic_year_id = $3
     ORDER BY sub.code, ac.strand, ac.competency`,
    [studentId, termId, academicYearId],
  );

  const { rows: comments } = await query<{
    class_teacher_comment: string | null;
    headteacher_comment: string | null;
  }>(
    `SELECT class_teacher_comment, headteacher_comment
     FROM assessment_comments
     WHERE student_id = $1 AND term_id = $2 AND academic_year_id = $3`,
    [studentId, termId, academicYearId],
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
    subjects: scores.map((r) => ({
      name: r.subject_name,
      code: r.subject_code,
      strand: r.strand,
      competency: r.competency,
      rating: r.rating,
      descriptor: getCbcDescriptor(r.rating),
    })),
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
  const st = await loadStudentContext(studentId, termId);

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
