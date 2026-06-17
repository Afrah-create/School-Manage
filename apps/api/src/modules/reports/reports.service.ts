import type { Readable } from "stream";
import { query } from "../../config/db";
import { activeTenantIdFromContext } from "../../utils/activeTenant.js";
import { HttpError } from "../../utils/httpError";
import { invalidateReportPdfCache, withReportPdfCache } from "../../utils/reportPdfCache.js";
import { streamAlevelReportCard, streamCbcReportCard } from "../../utils/pdf";
import { recalculateExamMarkGrades } from "../exams/exams.service";
import {
  compileAlevelReportPayload,
  compileCbcReportPayload,
} from "./reportCompiler";
import {
  assertReportReadiness,
  listExamPaperSubjectIds,
  termTrackingExcludingExamPapers,
  getClassContext,
  listSubjectReadiness,
  listSubjectSubmissionTracking,
} from "./reportReadiness";
import type { AlevelReportPayload, CbcReportPayload, ReportTrack } from "./reportTypes";
import {
  attachClassRankings,
  type CompiledReportEntry,
} from "./classReportRanking";
import {
  assertExamReadyForReports,
  compileAlevelReportFromExam,
  compileCbcReportWithExam,
  listExamSubjectTracking,
  listExamsForReportOptions,
  tryResolveExamForReports,
} from "./reportExamLinkage";
import { applyReportSourceMeta, reportSourceFromPayload } from "./reportSourceMeta";

type PdfBrandingSettings = {
  motto: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  report_footer_text: string | null;
  report_layout: Record<string, unknown> | null;
};

async function loadPdfBrandingSettings(tenantId: string) {
  let s: PdfBrandingSettings | undefined;
  try {
    const tid = tenantId;
    const { rows } = await query<PdfBrandingSettings>(
      `SELECT motto, logo_url, primary_color, secondary_color, report_footer_text, report_layout
       FROM tenant_settings
       WHERE tenant_id = $1
       LIMIT 1`,
      [tid],
    );
    s = rows[0];
  } catch {
    s = undefined;
  }
  return {
    motto: s?.motto ?? null,
    branding: {
      logoUrl: s?.logo_url ?? null,
      primaryColor: s?.primary_color ?? null,
      secondaryColor: s?.secondary_color ?? null,
      footerText: s?.report_footer_text ?? null,
    },
    layout: (s?.report_layout ?? null) as
      | {
          template?: "classic" | "modern";
          density?: "compact" | "comfortable";
          showStudentPhoto?: boolean;
          showTableStripes?: boolean;
          headerAlignment?: "left" | "center";
          cornerRadius?: number;
          baseFontSize?: number;
        }
      | null,
  };
}

export async function listReportExamOptions(classId: string, termId: string) {
  return listExamsForReportOptions(classId, termId);
}

export async function getTermReportDefault(classId: string, termId: string) {
  const { rows } = await query<{ exam_id: string | null }>(
    `SELECT exam_id FROM term_report_defaults WHERE class_id = $1 AND term_id = $2`,
    [classId, termId],
  );
  const examId = rows[0]?.exam_id ?? null;
  if (!examId) return { examId: null, examName: null, clearedStaleDefault: false };
  const exam = await tryResolveExamForReports(examId, classId, termId);
  if (!exam) {
    await query(`DELETE FROM term_report_defaults WHERE class_id = $1 AND term_id = $2`, [
      classId,
      termId,
    ]);
    return { examId: null, examName: null, clearedStaleDefault: true };
  }
  return { examId: exam.id, examName: exam.name, clearedStaleDefault: false };
}

export async function setTermReportDefault(
  classId: string,
  termId: string,
  examId: string | null,
  updatedBy?: string,
) {
  if (examId) {
    const exam = await tryResolveExamForReports(examId, classId, termId);
    if (!exam) {
      throw new HttpError(400, "That exam is not available for this class and term.");
    }
  }

  await query(
    `INSERT INTO term_report_defaults (class_id, term_id, exam_id, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (class_id, term_id) DO UPDATE SET
       exam_id = EXCLUDED.exam_id,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [classId, termId, examId, updatedBy ?? null],
  );

  return getTermReportDefault(classId, termId);
}

export async function getReportReadiness(classId: string, termId: string, examId?: string) {
  const ctx = await getClassContext(classId, termId);
  const { rows } = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM students WHERE class_id = $1 AND status = 'active'`,
    [classId],
  );
  const activeStudents = rows[0]?.c ?? 0;

  const [subjects, subjectTracking] = await Promise.all([
    listSubjectReadiness(classId, termId, ctx.academicYearId, ctx.track),
    listSubjectSubmissionTracking(
      classId,
      termId,
      ctx.academicYearId,
      ctx.track,
      activeStudents,
    ),
  ]);

  const [examOptions, termDefault] = await Promise.all([
    listExamsForReportOptions(classId, termId),
    getTermReportDefault(classId, termId),
  ]);
  const resolvedExam = examId ? await tryResolveExamForReports(examId, classId, termId) : null;
  const examLinkInvalid = Boolean(examId && !resolvedExam);
  const examNotClosed = Boolean(resolvedExam && resolvedExam.status !== "closed");
  const activeLinkedExamId = resolvedExam?.id ?? null;

  let examTracking: Awaited<ReturnType<typeof listExamSubjectTracking>> | undefined;
  let examReady = false;
  let examPaperSubjectIds: string[] = [];
  if (activeLinkedExamId) {
    examTracking = await listExamSubjectTracking(activeLinkedExamId, activeStudents);
    const subjectsSubmitted =
      examTracking.length > 0 && examTracking.every((t) => t.status === "submitted");
    examReady = subjectsSubmitted && !examNotClosed;
    if (ctx.track === "cbc") {
      examPaperSubjectIds = await listExamPaperSubjectIds(activeLinkedExamId);
    }
  }

  const termSubjectTracking =
    examPaperSubjectIds.length > 0
      ? termTrackingExcludingExamPapers(subjectTracking, examPaperSubjectIds)
      : subjectTracking;

  const pending = termSubjectTracking.filter((s) => s.status !== "submitted");
  const submitted = termSubjectTracking.filter((s) => s.status === "submitted");

  const termReady =
    activeStudents > 0 &&
    pending.length === 0 &&
    (ctx.track === "cbc" && activeLinkedExamId
      ? termSubjectTracking.length > 0 || examPaperSubjectIds.length > 0
      : subjectTracking.length > 0);

  let ready = termReady;
  if (examLinkInvalid) {
    examTracking = undefined;
    examReady = false;
    ready = termReady;
  } else if (activeLinkedExamId) {
    if (ctx.track === "alevel") {
      ready = examReady && activeStudents > 0;
    } else {
      ready = termReady && examReady;
    }
  }

  const teachersPending = new Map<
    string,
    { teacherId: string | null; teacherName: string; teacherEmail: string | null; subjects: string[] }
  >();
  for (const row of pending) {
    const key = row.teacherId ?? "__unassigned__";
    const label = row.teacherId
      ? row.teacherName?.trim() || "Teacher"
      : "Unassigned subjects";
    const existing = teachersPending.get(key);
    if (existing) {
      existing.subjects.push(row.subjectCode);
    } else {
      teachersPending.set(key, {
        teacherId: row.teacherId,
        teacherName: label,
        teacherEmail: row.teacherEmail,
        subjects: [row.subjectCode],
      });
    }
  }

  return {
    track: ctx.track,
    classLevel: ctx.classLevel,
    className: ctx.className,
    termNumber: ctx.termNumber,
    activeStudents,
    subjects,
    subjectTracking: termSubjectTracking,
    allSubjectTracking: subjectTracking,
    submittedCount: submitted.length,
    pendingCount: pending.length,
    totalSubjects: termSubjectTracking.length,
    examPaperSubjectCount: examPaperSubjectIds.length,
    ready,
    pendingSubjectCodes: pending.map((s) => s.subjectCode),
    teachersPending: [...teachersPending.values()],
    examOptions,
    examTracking,
    examReady: activeLinkedExamId ? examReady : undefined,
    linkedExamId: activeLinkedExamId,
    examLinkInvalid,
    examNotClosed,
    termReady,
    defaultExamId: termDefault.examId,
    defaultExamName: termDefault.examName,
    clearedStaleDefault: termDefault.clearedStaleDefault ?? false,
  };
}

async function upsertCbcReport(
  studentId: string,
  termId: string,
  academicYearId: string,
  payload: CbcReportPayload,
) {
  const ex = await query<{ id: string; is_approved: boolean; payload: unknown | null }>(
    `SELECT id, is_approved, payload FROM cbc_report_cards WHERE student_id = $1 AND term_id = $2`,
    [studentId, termId],
  );
  const existing = ex.rows[0];
  const existingExamId = examIdFromPayload(existing?.payload);
  const incomingExamId = examIdFromPayload(payload);
  const sameSource = existingExamId === incomingExamId;
  if (existing?.is_approved && sameSource) {
    throw new HttpError(
      400,
      `Report for ${payload.studentName} is already approved. Unlock or create a new term before regenerating.`,
    );
  }

  const teacherComment = payload.teacherComment || null;
  const headteacherComment = payload.headteacherComment || null;

  if (ex.rows.length > 0) {
    await query(
      `UPDATE cbc_report_cards SET
         academic_year_id = $2,
         payload = $3::jsonb,
         computed_at = NOW(),
         updated_at = NOW(),
         is_approved = false,
         approved_by = NULL,
         approved_at = NULL,
         teacher_comment = COALESCE($4, teacher_comment),
         headteacher_comment = COALESCE($5, headteacher_comment)
       WHERE id = $1`,
      [ex.rows[0]!.id, academicYearId, JSON.stringify(payload), teacherComment, headteacherComment],
    );
    return ex.rows[0]!.id;
  }

  const ins = await query<{ id: string }>(
    `INSERT INTO cbc_report_cards (
       student_id, term_id, academic_year_id, payload, computed_at,
       teacher_comment, headteacher_comment, updated_at
     ) VALUES ($1, $2, $3, $4::jsonb, NOW(), $5, $6, NOW())
     RETURNING id`,
    [studentId, termId, academicYearId, JSON.stringify(payload), teacherComment, headteacherComment],
  );
  return ins.rows[0]!.id;
}

async function upsertAlevelReport(
  studentId: string,
  termId: string,
  academicYearId: string,
  payload: AlevelReportPayload,
) {
  const ex = await query<{ id: string; is_approved: boolean; payload: unknown | null }>(
    `SELECT id, is_approved, payload FROM alevel_results WHERE student_id = $1 AND term_id = $2`,
    [studentId, termId],
  );
  const existing = ex.rows[0];
  const existingExamId = examIdFromPayload(existing?.payload);
  const incomingExamId = examIdFromPayload(payload);
  const sameSource = existingExamId === incomingExamId;
  if (existing?.is_approved && sameSource) {
    throw new HttpError(
      400,
      `Report for ${payload.studentName} is already approved. You cannot overwrite an approved report card.`,
    );
  }

  const teacherComment = payload.teacherComment || null;
  const headteacherRemark = payload.headteacherRemark || null;

  if (ex.rows.length > 0) {
    await query(
      `UPDATE alevel_results SET
         academic_year_id = $2,
         total_points = $3,
         division = $4,
         payload = $5::jsonb,
         computed_at = NOW(),
         updated_at = NOW(),
         is_approved = false,
         approved_by = NULL,
         approved_at = NULL,
         teacher_comment = COALESCE($6, teacher_comment),
         headteacher_remark = COALESCE($7, headteacher_remark)
       WHERE id = $1`,
      [
        ex.rows[0]!.id,
        academicYearId,
        payload.totalPoints,
        payload.division,
        JSON.stringify(payload),
        teacherComment,
        headteacherRemark,
      ],
    );
    await syncDivisionSummary(studentId, termId, academicYearId, payload);
    return ex.rows[0]!.id;
  }

  const ins = await query<{ id: string }>(
    `INSERT INTO alevel_results (
       student_id, term_id, academic_year_id, total_points, division,
       payload, computed_at, teacher_comment, headteacher_remark, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), $7, $8, NOW())
     RETURNING id`,
    [
      studentId,
      termId,
      academicYearId,
      payload.totalPoints,
      payload.division,
      JSON.stringify(payload),
      teacherComment,
      headteacherRemark,
    ],
  );
  await syncDivisionSummary(studentId, termId, academicYearId, payload);
  return ins.rows[0]!.id;
}

async function syncDivisionSummary(
  studentId: string,
  termId: string,
  academicYearId: string,
  payload: AlevelReportPayload,
) {
  const student = await query<{ combination_id: string | null }>(
    `SELECT combination_id FROM students WHERE id = $1`,
    [studentId],
  );
  await query(
    `INSERT INTO student_division_summary (
      student_id, term_id, academic_year_id, combination_id, total_points, division, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (student_id, term_id, academic_year_id) DO UPDATE SET
      combination_id = EXCLUDED.combination_id,
      total_points = EXCLUDED.total_points,
      division = EXCLUDED.division,
      updated_at = NOW()`,
    [
      studentId,
      termId,
      academicYearId,
      student.rows[0]?.combination_id ?? null,
      payload.totalPoints,
      payload.division,
    ],
  );
}

export async function generateReportsForClass(
  classId: string,
  termId: string,
  examId?: string,
) {
  const ctx = await getClassContext(classId, termId);

  const { rows: students } = await query<{ id: string; full_name: string }>(
    `SELECT id, full_name FROM students WHERE class_id = $1 AND status = 'active' ORDER BY full_name`,
    [classId],
  );
  const activeStudents = students.length;
  if (activeStudents === 0) {
    throw new HttpError(400, "This class has no active students to include on report cards.");
  }

  const reportIds: string[] = [];
  const warnings: string[] = [];

  let exam: Awaited<ReturnType<typeof tryResolveExamForReports>> | undefined;
  if (examId) {
    exam = await tryResolveExamForReports(examId, classId, termId);
    if (!exam) {
      warnings.push(
        "The selected exam was deleted or is no longer available. Report cards will use term assessment marks only.",
      );
    } else {
      await assertExamReadyForReports(exam.id, activeStudents);
      await recalculateExamMarkGrades(exam.id);
    }
  }

  if (exam && ctx.track === "cbc") {
    await assertReportReadiness(classId, termId, { linkedExamId: exam.id });
  } else if (!exam) {
    await assertReportReadiness(classId, termId);
  } else {
    // A-Level from active exam only — term assessment scores not required
  }

  const compiled: CompiledReportEntry[] = [];

  for (const student of students) {
    try {
      if (ctx.track === "cbc") {
        let payload = exam
          ? await compileCbcReportWithExam(student.id, termId, ctx.academicYearId, exam)
          : await compileCbcReportPayload(student.id, termId, ctx.academicYearId);
        payload = applyReportSourceMeta(
          payload,
          exam ? { type: "exam", examId: exam.id, examName: exam.name } : { type: "term" },
        );
        const hasCbc = payload.subjects.length > 0;
        const hasExamMarks = (payload.formalExam?.subjects.length ?? 0) > 0;
        if (!hasCbc && !hasExamMarks) {
          warnings.push(
            `${student.full_name}: no term CBC competency ratings and no formal exam marks on file.`,
          );
          continue;
        }
        if (!hasCbc && hasExamMarks) {
          warnings.push(
            `${student.full_name}: formal exam marks only — no term CBC competency ratings for other subjects.`,
          );
        }
        if (exam && !hasExamMarks) {
          warnings.push(`${student.full_name}: no marks on exam "${exam.name}" for this student.`);
        }
        compiled.push({ studentId: student.id, track: "cbc", payload });
      } else {
        let payload = exam
          ? await compileAlevelReportFromExam(student.id, termId, ctx.academicYearId, exam)
          : await compileAlevelReportPayload(student.id, termId, ctx.academicYearId);
        payload = applyReportSourceMeta(
          payload,
          exam ? { type: "exam", examId: exam.id, examName: exam.name } : { type: "term" },
        );
        if (payload.subjects.length === 0) {
          warnings.push(
            exam
              ? `${student.full_name}: no exam marks on "${exam.name}" for this student.`
              : `${student.full_name}: no A-Level scores found for this term.`,
          );
          continue;
        }
        if (payload.division === "Incomplete") {
          warnings.push(
            `${student.full_name}: fewer than three subjects with points — division marked Incomplete.`,
          );
        }
        compiled.push({ studentId: student.id, track: "alevel", payload });
      }
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(
        500,
        `Could not compile a report for ${student.full_name}. ${e instanceof Error ? e.message : "Please try again."}`,
      );
    }
  }

  const ranked = attachClassRankings(compiled);

  for (const entry of ranked) {
    if (entry.track === "cbc") {
      const id = await upsertCbcReport(entry.studentId, termId, ctx.academicYearId, entry.payload);
      reportIds.push(id);
    } else {
      const id = await upsertAlevelReport(entry.studentId, termId, ctx.academicYearId, entry.payload);
      reportIds.push(id);
    }
  }

  if (reportIds.length === 0) {
    throw new HttpError(
      400,
      exam && ctx.track === "cbc"
        ? "No report cards were created. For O-Level: students need formal exam marks on the closed exam, and term CBC competency ratings (A–D) for subjects not on that exam — enter those under Assessment → CBC."
        : exam
          ? "No report cards were created. Ensure every student has marks on the selected closed exam."
          : "No report cards were created. Ensure students have submitted assessment marks for this term.",
    );
  }

  return {
    track: ctx.track as ReportTrack,
    reportIds,
    count: reportIds.length,
    warnings,
    skipped: students.length - reportIds.length,
    sourceType: (exam ? "exam" : "term") as "exam" | "term",
    sourceExamId: exam?.id ?? null,
    sourceExamName: exam?.name ?? null,
    usedTermAssessmentsFallback: Boolean(examId && !exam),
  };
}

/** Regenerate all non-approved report cards for a class/term (same rules as generate). */
export async function regenerateReportsForClass(
  classId: string,
  termId: string,
  examId?: string,
) {
  const tid = activeTenantIdFromContext();
  await invalidateReportPdfCache(tid);
  return generateReportsForClass(classId, termId, examId);
}

function examIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.sourceExamId === "string") return p.sourceExamId;
  const formal = p.formalExam as { examId?: string } | undefined;
  if (formal && typeof formal.examId === "string") return formal.examId;
  return null;
}

async function activeExamIdSet(examIds: string[]): Promise<Set<string>> {
  if (examIds.length === 0) return new Set();
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM exams WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
    [examIds],
  );
  return new Set(rows.map((r) => r.id));
}

function examLinkStatusForPayload(
  payload: unknown,
  activeIds: Set<string>,
): "none" | "active" | "deleted" {
  const linked = examIdFromPayload(payload);
  if (!linked) return "none";
  return activeIds.has(linked) ? "active" : "deleted";
}

/** @deprecated Use generateReportsForClass — kept for backward compatibility */
export async function generateCbcReports(classId: string, termId: string) {
  const ctx = await getClassContext(classId, termId);
  if (ctx.track !== "cbc") {
    throw new HttpError(
      400,
      "This class is A-Level. Use Generate report cards (the system picks the correct template from the class level).",
    );
  }
  return generateReportsForClass(classId, termId);
}

/** @deprecated Use generateReportsForClass */
export async function generateAlevelReports(classId: string, termId: string) {
  const ctx = await getClassContext(classId, termId);
  if (ctx.track !== "alevel") {
    throw new HttpError(
      400,
      "This class is O-Level (CBC). Use Generate report cards for the CBC template.",
    );
  }
  return generateReportsForClass(classId, termId);
}

export async function approveReport(reportId: string, approvedBy: string) {
  const cbc = await query<{ id: string; payload: unknown }>(
    `SELECT id, payload FROM cbc_report_cards WHERE id = $1`,
    [reportId],
  );
  if (cbc.rows.length > 0) {
    if (!cbc.rows[0]!.payload) {
      throw new HttpError(
        400,
        "This report has no computed results yet. Generate report cards before approving.",
      );
    }
    await query(
      `UPDATE cbc_report_cards SET is_approved = true, approved_by = $1, approved_at = NOW() WHERE id = $2`,
      [approvedBy, reportId],
    );
    return { type: "cbc" as const };
  }

  const al = await query<{ id: string; payload: unknown }>(
    `SELECT id, payload FROM alevel_results WHERE id = $1`,
    [reportId],
  );
  if (al.rows.length > 0) {
    if (!al.rows[0]!.payload) {
      throw new HttpError(
        400,
        "This report has no computed results yet. Generate report cards before approving.",
      );
    }
    await query(
      `UPDATE alevel_results SET is_approved = true, approved_by = $1, approved_at = NOW() WHERE id = $2`,
      [approvedBy, reportId],
    );
    return { type: "alevel" as const };
  }

  throw new HttpError(404, "We could not find that report. It may have been removed.");
}

async function payloadToCbcPdf(payload: CbcReportPayload, tenantId: string): Promise<Readable> {
  const settings = await loadPdfBrandingSettings(tenantId);
  return streamCbcReportCard({
    schoolName: payload.schoolName,
    studentName: payload.studentName,
    studentNumber: payload.studentNumber,
    className: payload.className,
    stream: payload.stream,
    term: payload.termLabel,
    year: payload.yearName,
    photoPath: payload.photoUrl,
    subjects: payload.subjects.map((s) => ({
      name: s.name,
      strand: s.strand,
      competency: s.competency,
      rating: s.rating,
    })),
    formalExam: payload.formalExam,
    subjectSummaries: payload.subjectSummaries,
    certification: payload.certification
      ? {
          resultCode: payload.certification.resultCode,
          label: payload.certification.label,
          reasonLabels: payload.certification.reasonLabels,
        }
      : undefined,
    daysAttended: payload.daysAttended,
    totalDays: payload.totalDays,
    teacherComment: payload.teacherComment,
    headteacherComment: payload.headteacherComment,
    motto: settings.motto,
    branding: settings.branding,
    layout: settings.layout ?? undefined,
    ranking: payload.ranking
      ? {
          positionDisplay: payload.ranking.positionDisplay,
          aggregateLabel: payload.ranking.aggregateLabel,
        }
      : undefined,
  });
}

async function payloadToAlevelPdf(payload: AlevelReportPayload, tenantId: string): Promise<Readable> {
  const settings = await loadPdfBrandingSettings(tenantId);
  return streamAlevelReportCard({
    schoolName: payload.schoolName,
    studentName: payload.studentName,
    studentNumber: payload.studentNumber,
    className: payload.className,
    combination: payload.combination,
    term: payload.termLabel,
    year: payload.yearName,
    photoPath: payload.photoUrl ?? null,
    sourceExamName: payload.sourceExamName,
    subjects: payload.subjects.map((s) => ({
      name: s.name,
      code: s.code,
      score: String(s.score),
      grade: s.grade,
      points: s.points,
    })),
    totalPoints: payload.totalPoints,
    division: payload.division,
    teacherComment: payload.teacherComment,
    headteacherRemark: payload.headteacherRemark,
    motto: settings.motto,
    branding: settings.branding,
    layout: settings.layout ?? undefined,
    ranking: payload.ranking
      ? {
          positionDisplay: payload.ranking.positionDisplay,
          aggregateLabel: payload.ranking.aggregateLabel,
        }
      : undefined,
  });
}

export async function getReportPdfStream(reportId: string, tenantId?: string): Promise<Readable> {
  const tid = tenantId ?? activeTenantIdFromContext();
  return withReportPdfCache(tid, reportId, async () => {
    const cbc = await query<{ payload: CbcReportPayload | null; is_approved: boolean }>(
      `SELECT payload, is_approved FROM cbc_report_cards WHERE id = $1`,
      [reportId],
    );
    if (cbc.rows.length > 0) {
      const row = cbc.rows[0]!;
      if (!row.payload) {
        throw new HttpError(
          400,
          "This report card has not been generated yet. Run Generate report cards first.",
        );
      }
      return payloadToCbcPdf(row.payload as CbcReportPayload, tid);
    }

    const al = await query<{ payload: AlevelReportPayload | null }>(
      `SELECT payload FROM alevel_results WHERE id = $1`,
      [reportId],
    );
    if (al.rows.length > 0) {
      const row = al.rows[0]!;
      if (!row.payload) {
        throw new HttpError(
          400,
          "This report card has not been generated yet. Run Generate report cards first.",
        );
      }
      return payloadToAlevelPdf(row.payload as AlevelReportPayload, tid);
    }

    throw new HttpError(404, "We could not find that report. Check the report ID and try again.");
  });
}

export async function listClassReports(classId: string, termId: string) {
  const ctx = await getClassContext(classId, termId);
  if (ctx.track === "cbc") {
    const { rows } = await query<{
      id: string;
      student_id: string;
      full_name: string;
      student_number: string;
      is_approved: boolean;
      computed_at: Date | null;
      payload: CbcReportPayload | null;
    }>(
      `SELECT cr.id, cr.student_id, s.full_name, s.student_number, cr.is_approved, cr.computed_at, cr.payload
       FROM cbc_report_cards cr
       JOIN students s ON s.id = cr.student_id
       WHERE s.class_id = $1 AND cr.term_id = $2
       ORDER BY s.full_name`,
      [classId, termId],
    );
    const linkedIds = rows
      .map((r) => examIdFromPayload(r.payload))
      .filter((id): id is string => Boolean(id));
    const activeIds = await activeExamIdSet([...new Set(linkedIds)]);
    return {
      track: "cbc" as const,
      reports: rows.map((r) => {
        const source = reportSourceFromPayload(r.payload);
        return {
          id: r.id,
          studentId: r.student_id,
          studentName: r.full_name,
          studentNumber: r.student_number,
          isApproved: Boolean(r.is_approved),
          computedAt: r.computed_at ? new Date(r.computed_at).toISOString() : null,
          examLinkStatus: examLinkStatusForPayload(r.payload, activeIds),
          reportSourceType: source.sourceType,
          reportSourceLabel: source.sourceLabel,
          payloadGeneratedAt: source.generatedAt,
          ranking: r.payload?.ranking ?? null,
          rankingLabel: r.payload?.ranking?.positionDisplay ?? null,
          aggregateLabel: r.payload?.ranking?.aggregateLabel ?? null,
          certificationLabel: r.payload?.certification?.label ?? null,
        };
      }),
    };
  }

  const { rows } = await query<{
    id: string;
    student_id: string;
    full_name: string;
    student_number: string;
    is_approved: boolean;
    computed_at: Date | null;
    division: string | null;
    total_points: number | null;
    payload: AlevelReportPayload | null;
  }>(
    `SELECT ar.id, ar.student_id, s.full_name, s.student_number,
            ar.is_approved, ar.computed_at, ar.division, ar.total_points, ar.payload
     FROM alevel_results ar
     JOIN students s ON s.id = ar.student_id
     WHERE s.class_id = $1 AND ar.term_id = $2
     ORDER BY s.full_name`,
    [classId, termId],
  );
  const linkedIds = rows
    .map((r) => examIdFromPayload(r.payload))
    .filter((id): id is string => Boolean(id));
  const activeIds = await activeExamIdSet([...new Set(linkedIds)]);
  return {
    track: "alevel" as const,
    reports: rows.map((r) => {
      const source = reportSourceFromPayload(r.payload);
      return {
        id: r.id,
        studentId: r.student_id,
        studentName: r.full_name,
        studentNumber: r.student_number,
        isApproved: Boolean(r.is_approved),
        computedAt: r.computed_at ? new Date(r.computed_at).toISOString() : null,
        division: r.division,
        totalPoints: r.total_points,
        examLinkStatus: examLinkStatusForPayload(r.payload, activeIds),
        reportSourceType: source.sourceType,
        reportSourceLabel: source.sourceLabel,
        payloadGeneratedAt: source.generatedAt,
        ranking: r.payload?.ranking ?? null,
        rankingLabel: r.payload?.ranking?.positionDisplay ?? null,
        aggregateLabel: r.payload?.ranking?.aggregateLabel ?? null,
      };
    }),
  };
}

export async function getClassRankingLeaderboard(classId: string, termId: string) {
  const listed = await listClassReports(classId, termId);
  const ranked = listed.reports
    .filter((r) => r.ranking != null)
    .sort((a, b) => {
      const pa = a.ranking!.position;
      const pb = b.ranking!.position;
      if (pa !== pb) return pa - pb;
      return a.studentName.localeCompare(b.studentName);
    });
  return {
    track: listed.track,
    classSize: ranked[0]?.ranking?.classSize ?? listed.reports.length,
    method: ranked[0]?.ranking?.method ?? null,
    leaderboard: ranked,
  };
}
