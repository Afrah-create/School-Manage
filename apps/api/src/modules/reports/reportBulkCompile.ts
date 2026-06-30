import { computeAlevelAggregate } from "../../utils/alevelDivision";
import { normalizeClassLevel } from "../../utils/classLevel";
import { query } from "../../config/db";
import { createGradingResolver, loadActiveLetterGradeDescriptorMap } from "../../utils/gradingScales";
import { recomputeTermSubjectResultsForClass } from "../../utils/termSubjectGradeBulk";
import type { CompiledReportEntry } from "./classReportRanking";
import { loadGradingLegend, schoolDaysInRange } from "./reportCompiler";
import type { AlevelReportPayload, CbcReportPayload, ReportFormalExamSection } from "./reportTypes";
import { REPORT_PAYLOAD_VERSION } from "./reportTypes";
import { listExamsForReportOptions } from "./reportExamLinkage";

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

type StudentRow = { id: string; full_name: string };

type StudentContext = {
  id: string;
  full_name: string;
  student_number: string;
  photo_url: string | null;
  class_name: string | null;
  class_stream: string | null;
  combination_code: string | null;
  combination_name: string | null;
  term_number: number;
  year_name: string;
  academic_year_id: string;
  term_start: string;
  term_end: string;
};

export type BulkCompileOutcome = {
  entries: CompiledReportEntry[];
  warnings: string[];
};

async function resolveSchoolNameBulk(tenantId: string): Promise<string> {
  const { rows } = await query<{ school_name: string }>(
    `SELECT school_name FROM tenant_settings WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  return rows[0]?.school_name?.trim() || process.env.SCHOOL_NAME || "Uganda Secondary School";
}

async function loadStudentContexts(classId: string, termId: string): Promise<StudentContext[]> {
  const { rows } = await query<StudentContext>(
    `SELECT s.id, s.full_name, s.student_number, s.photo_url,
            c.name AS class_name, c.stream AS class_stream,
            sc.code AS combination_code, sc.name AS combination_name,
            t.term_number, ay.name AS year_name, ay.id AS academic_year_id,
            t.start_date AS term_start, t.end_date AS term_end
     FROM students s
     JOIN classes c ON c.id = s.class_id
     LEFT JOIN subject_combinations sc ON sc.id = s.combination_id
     JOIN terms t ON t.id = $2
     JOIN academic_years ay ON ay.id = t.academic_year_id
     WHERE s.class_id = $1 AND s.status = 'active'
     ORDER BY s.full_name`,
    [classId, termId],
  );
  return rows;
}

async function loadFormalExamSectionsByStudent(
  exam: ExamRow,
  studentIds: string[],
  gradingLevel: "O_LEVEL" | "A_LEVEL",
): Promise<Map<string, ReportFormalExamSection>> {
  if (studentIds.length === 0) return new Map();
  const maxScore = Number(exam.max_score);
  const resolveGrade = await createGradingResolver(gradingLevel);

  const { rows } = await query<{
    student_id: string;
    subject_name: string;
    subject_code: string;
    score: string | null;
    grade: string | null;
    points: number | null;
  }>(
    `SELECT ese.student_id, s.name AS subject_name, s.code AS subject_code,
            em.score::text AS score, em.grade, em.points
     FROM exam_student_entries ese
     JOIN subjects s ON s.id = ese.subject_id
     LEFT JOIN exam_marks em
       ON em.exam_id = ese.exam_id
      AND em.subject_id = ese.subject_id
      AND em.student_id = ese.student_id
     WHERE ese.exam_id = $1 AND ese.student_id = ANY($2::uuid[])
     ORDER BY ese.student_id, s.code`,
    [exam.id, studentIds],
  );

  const byStudent = new Map<string, ReportFormalExamSection>();
  for (const r of rows) {
    if (r.score == null) continue;
    const score = Number(r.score);
    if (Number.isNaN(score)) continue;
    let grade = r.grade ?? "";
    let points = r.points;
    if (!grade || points == null) {
      const resolved = resolveGrade(score);
      grade = resolved.grade;
      points = resolved.points;
    }
    const section =
      byStudent.get(r.student_id) ??
      ({
        examId: exam.id,
        examName: exam.name,
        maxScore,
        subjects: [],
      } satisfies ReportFormalExamSection);
    section.subjects.push({
      name: r.subject_name,
      code: r.subject_code,
      score,
      grade,
      points: points != null ? Number(points) : null,
      maxScore,
    });
    byStudent.set(r.student_id, section);
  }
  return byStudent;
}

async function compileCbcBulk(
  classId: string,
  termId: string,
  students: StudentRow[],
  exam: ExamRow | null | undefined,
  tenantId: string,
): Promise<BulkCompileOutcome> {
  await recomputeTermSubjectResultsForClass(classId, termId, tenantId);

  const contexts = await loadStudentContexts(classId, termId);
  const ctxById = new Map(contexts.map((c) => [c.id, c]));
  const studentIds = students.map((s) => s.id);

  const [
    schoolName,
    examOptions,
    descriptorMap,
    gradingScaleLegend,
    termRows,
    commentRows,
    legacyRows,
    attendanceRows,
  ] = await Promise.all([
    resolveSchoolNameBulk(tenantId),
    listExamsForReportOptions(classId, termId),
    loadActiveLetterGradeDescriptorMap(),
    loadGradingLegend(),
    query<{
      student_id: string;
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
      `SELECT tsr.student_id, sub.code AS subject_code, sub.name AS subject_name,
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
       JOIN students st ON st.id = tsr.student_id AND st.class_id = $3
       WHERE tsr.term_id = $2 AND tsr.student_id = ANY($1::uuid[])
       ORDER BY tsr.student_id, sub.code`,
      [studentIds, termId, classId],
    ).then((r) => r.rows),
    query<{
      student_id: string;
      class_teacher_comment: string | null;
      headteacher_comment: string | null;
    }>(
      `SELECT student_id, class_teacher_comment, headteacher_comment
       FROM assessment_comments
       WHERE term_id = $1 AND student_id = ANY($2::uuid[])`,
      [termId, studentIds],
    ).then((r) => r.rows),
    query<{
      student_id: string;
      teacher_comment: string | null;
      headteacher_comment: string | null;
    }>(
      `SELECT student_id, teacher_comment, headteacher_comment
       FROM cbc_report_cards
       WHERE term_id = $1 AND student_id = ANY($2::uuid[])`,
      [termId, studentIds],
    ).then((r) => r.rows),
    query<{ student_id: string; c: string }>(
      `SELECT a.student_id, COUNT(*)::text AS c
       FROM attendance a
       WHERE a.student_id = ANY($1::uuid[])
         AND a.date >= $2::date AND a.date <= $3::date
         AND a.status = 'present'
       GROUP BY a.student_id`,
      [studentIds, contexts[0]?.term_start ?? "1970-01-01", contexts[0]?.term_end ?? "2099-12-31"],
    ).then((r) => r.rows),
  ]);

  const examColumns = examOptions.map((e) => ({
    examId: e.id,
    name: e.name,
    examDate: e.examDate,
  }));
  const examOrder = examColumns.map((e) => e.examId);
  const totalDays = contexts[0]
    ? await schoolDaysInRange(contexts[0].term_start, contexts[0].term_end)
    : 1;

  const termByStudent = new Map<string, typeof termRows>();
  for (const row of termRows) {
    const list = termByStudent.get(row.student_id) ?? [];
    list.push(row);
    termByStudent.set(row.student_id, list);
  }
  const commentsByStudent = new Map(commentRows.map((r) => [r.student_id, r]));
  const legacyByStudent = new Map(legacyRows.map((r) => [r.student_id, r]));
  const attendanceByStudent = new Map(attendanceRows.map((r) => [r.student_id, Number(r.c)]));

  let formalByStudent = new Map<string, ReportFormalExamSection>();
  if (exam) {
    const { rows: classRow } = await query<{ level: string }>(
      `SELECT level FROM classes WHERE id = $1`,
      [exam.class_id],
    );
    const level = normalizeClassLevel(classRow[0]?.level);
    formalByStudent = await loadFormalExamSectionsByStudent(exam, studentIds, level);
  }

  const entries: CompiledReportEntry[] = [];
  const warnings: string[] = [];

  for (const student of students) {
    const st = ctxById.get(student.id);
    if (!st) continue;

    const rows = termByStudent.get(student.id) ?? [];
    const termSubjectRows = rows.map((r) => {
      const breakdown = Array.isArray(r.exam_breakdown)
        ? (r.exam_breakdown as Array<{ examId: string; scorePct: number; teacherInitial?: string | null }>)
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

    if (termSubjectRows.length === 0) {
      warnings.push(
        `${student.full_name}: no term subject grades on file — enter compulsory exam marks (and project work if enabled).`,
      );
      continue;
    }

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

    const commentRow = commentsByStudent.get(student.id);
    const legacyRow = legacyByStudent.get(student.id);
    const formal = formalByStudent.get(student.id);

    const payload: CbcReportPayload = {
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
      daysAttended: attendanceByStudent.get(student.id) ?? 0,
      totalDays,
      teacherComment:
        commentRow?.class_teacher_comment?.trim() || legacyRow?.teacher_comment?.trim() || "",
      headteacherComment:
        commentRow?.headteacher_comment?.trim() || legacyRow?.headteacher_comment?.trim() || "",
      ...(formal && formal.subjects.length > 0 ? { formalExam: formal } : {}),
      ...(exam ? { sourceExamId: exam.id, sourceExamName: exam.name } : {}),
    };

    entries.push({ studentId: student.id, track: "cbc", payload });
  }

  return { entries, warnings };
}

async function compileAlevelBulk(
  classId: string,
  termId: string,
  academicYearId: string,
  students: StudentRow[],
  exam: ExamRow | null | undefined,
  tenantId: string,
): Promise<BulkCompileOutcome> {
  const contexts = await loadStudentContexts(classId, termId);
  const ctxById = new Map(contexts.map((c) => [c.id, c]));
  const studentIds = students.map((s) => s.id);

  const [schoolName, scoreRows, commentRows, legacyRows, combinationRows] = await Promise.all([
    resolveSchoolNameBulk(tenantId),
    query<{
      student_id: string;
      subject_id: string;
      subject_name: string;
      subject_code: string;
      score: string;
      grade: string | null;
      points: number | null;
    }>(
      `SELECT aa.student_id, aa.subject_id, sub.name AS subject_name, sub.code AS subject_code,
              aa.score::text AS score, aa.grade, aa.points
       FROM assessments_alevel aa
       JOIN subjects sub ON sub.id = aa.subject_id
       JOIN students st ON st.id = aa.student_id AND st.class_id = $4
       WHERE aa.term_id = $1 AND aa.academic_year_id = $2 AND aa.student_id = ANY($3::uuid[])
       ORDER BY aa.student_id, sub.code`,
      [termId, academicYearId, studentIds, classId],
    ).then((r) => r.rows),
    query<{
      student_id: string;
      class_teacher_comment: string | null;
      headteacher_remark: string | null;
    }>(
      `SELECT student_id, class_teacher_comment, headteacher_remark
       FROM assessment_alevel_comments
       WHERE term_id = $1 AND academic_year_id = $2 AND student_id = ANY($3::uuid[])`,
      [termId, academicYearId, studentIds],
    ).then((r) => r.rows),
    query<{
      student_id: string;
      teacher_comment: string | null;
      headteacher_remark: string | null;
    }>(
      `SELECT student_id, teacher_comment, headteacher_remark
       FROM alevel_results WHERE term_id = $1 AND student_id = ANY($2::uuid[])`,
      [termId, studentIds],
    ).then((r) => r.rows),
    query<{ id: string; combination_id: string | null }>(
      `SELECT id, combination_id FROM students WHERE id = ANY($1::uuid[])`,
      [studentIds],
    ).then((r) => r.rows),
  ]);

  const resolveGrade = await createGradingResolver("A_LEVEL");
  const scoresByStudent = new Map<string, typeof scoreRows>();
  const gradeFixes: Array<{
    studentId: string;
    subjectId: string;
    grade: string;
    points: number | null;
  }> = [];

  for (const row of scoreRows) {
    const list = scoresByStudent.get(row.student_id) ?? [];
    list.push(row);
    scoresByStudent.set(row.student_id, list);
    if (!row.grade || row.points == null) {
      const score = Number(row.score);
      if (!Number.isNaN(score)) {
        const resolved = resolveGrade(score);
        gradeFixes.push({
          studentId: row.student_id,
          subjectId: row.subject_id,
          grade: resolved.grade,
          points: resolved.points,
        });
        row.grade = resolved.grade;
        row.points = resolved.points;
      }
    }
  }

  if (gradeFixes.length > 0) {
    const { BULK_CHUNK_SIZE } = await import("../../utils/bulkConstants.js");
    for (let i = 0; i < gradeFixes.length; i += BULK_CHUNK_SIZE) {
      const chunk = gradeFixes.slice(i, i + BULK_CHUNK_SIZE);
      await query(
        `UPDATE assessments_alevel aa
         SET grade = u.grade, points = u.points, updated_at = NOW()
         FROM UNNEST($1::uuid[], $2::uuid[], $3::text[], $4::int[]) AS u(student_id, subject_id, grade, points)
         WHERE aa.student_id = u.student_id
           AND aa.subject_id = u.subject_id
           AND aa.term_id = $5
           AND aa.academic_year_id = $6`,
        [
          chunk.map((c) => c.studentId),
          chunk.map((c) => c.subjectId),
          chunk.map((c) => c.grade),
          chunk.map((c) => c.points),
          termId,
          academicYearId,
        ],
      );
    }
  }

  let formalByStudent = new Map<string, ReportFormalExamSection>();
  if (exam) {
    formalByStudent = await loadFormalExamSectionsByStudent(exam, studentIds, "A_LEVEL");
  }

  const commentsByStudent = new Map(commentRows.map((r) => [r.student_id, r]));
  const legacyByStudent = new Map(legacyRows.map((r) => [r.student_id, r]));
  const combinationByStudent = new Map(combinationRows.map((r) => [r.id, r.combination_id]));

  const entries: CompiledReportEntry[] = [];
  const warnings: string[] = [];

  for (const student of students) {
    const st = ctxById.get(student.id);
    if (!st) continue;

    const commentRow = commentsByStudent.get(student.id);
    const legacyRow = legacyByStudent.get(student.id);

    const base: AlevelReportPayload = {
      version: REPORT_PAYLOAD_VERSION,
      schoolName,
      studentName: st.full_name,
      studentNumber: st.student_number,
      className: st.class_name ?? "",
      combination: st.combination_code ?? st.combination_name ?? "",
      termLabel: `Term ${st.term_number}`,
      yearName: st.year_name,
      photoUrl: st.photo_url,
      subjects: [],
      totalPoints: 0,
      division: "Incomplete",
      teacherComment:
        commentRow?.class_teacher_comment?.trim() || legacyRow?.teacher_comment?.trim() || "",
      headteacherRemark:
        commentRow?.headteacher_remark?.trim() || legacyRow?.headteacher_remark?.trim() || "",
    };

    void combinationByStudent.get(student.id);

    if (exam) {
      const formal = formalByStudent.get(student.id);
      if (!formal || formal.subjects.length === 0) {
        warnings.push(`${student.full_name}: no exam marks on "${exam.name}" for this student.`);
        continue;
      }
      const pointValues = formal.subjects
        .map((s) => s.points)
        .filter((p): p is number => p != null && !Number.isNaN(p));
      const { totalPoints, division } = computeAlevelAggregate(pointValues);
      if (division === "Incomplete") {
        warnings.push(
          `${student.full_name}: fewer than three subjects with points — division marked Incomplete.`,
        );
      }
      entries.push({
        studentId: student.id,
        track: "alevel",
        payload: {
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
        },
      });
      continue;
    }

    const rows = scoresByStudent.get(student.id) ?? [];
    const subjects: AlevelReportPayload["subjects"] = [];
    const pointValues: number[] = [];
    for (const row of rows) {
      const score = Number(row.score);
      if (Number.isNaN(score)) continue;
      subjects.push({
        name: row.subject_name,
        code: row.subject_code,
        score,
        grade: row.grade ?? "",
        points: Number(row.points),
      });
      pointValues.push(Number(row.points));
    }

    if (subjects.length === 0) {
      warnings.push(`${student.full_name}: no A-Level scores found for this term.`);
      continue;
    }

    const { totalPoints, division } = computeAlevelAggregate(pointValues);
    if (division === "Incomplete") {
      warnings.push(
        `${student.full_name}: fewer than three subjects with points — division marked Incomplete.`,
      );
    }

    entries.push({
      studentId: student.id,
      track: "alevel",
      payload: { ...base, subjects, totalPoints, division },
    });
  }

  return { entries, warnings };
}

export async function compileReportsForClassBulk(params: {
  classId: string;
  termId: string;
  academicYearId: string;
  track: "cbc" | "alevel";
  students: StudentRow[];
  exam?: ExamRow | null;
  tenantId: string;
}): Promise<BulkCompileOutcome> {
  if (params.track === "cbc") {
    return compileCbcBulk(
      params.classId,
      params.termId,
      params.students,
      params.exam,
      params.tenantId,
    );
  }
  return compileAlevelBulk(
    params.classId,
    params.termId,
    params.academicYearId,
    params.students,
    params.exam,
    params.tenantId,
  );
}
