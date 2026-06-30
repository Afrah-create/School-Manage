import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { BULK_CHUNK_SIZE } from "../../utils/bulkConstants";
import type { CompiledReportEntry } from "./classReportRanking";
import type { AlevelReportPayload, CbcReportPayload } from "./reportTypes";

function examIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.sourceExamId === "string") return p.sourceExamId;
  const formal = p.formalExam as { examId?: string } | undefined;
  if (formal && typeof formal.examId === "string") return formal.examId;
  return null;
}

export async function bulkPersistCompiledReports(
  termId: string,
  academicYearId: string,
  ranked: CompiledReportEntry[],
): Promise<string[]> {
  if (ranked.length === 0) return [];

  const cbcEntries = ranked.filter((e): e is Extract<CompiledReportEntry, { track: "cbc" }> => e.track === "cbc");
  const alEntries = ranked.filter((e): e is Extract<CompiledReportEntry, { track: "alevel" }> => e.track === "alevel");

  const ids: string[] = [];
  if (cbcEntries.length > 0) {
    ids.push(...(await bulkUpsertCbcReports(termId, academicYearId, cbcEntries)));
  }
  if (alEntries.length > 0) {
    ids.push(...(await bulkUpsertAlevelReports(termId, academicYearId, alEntries)));
  }
  return ids;
}

async function bulkUpsertCbcReports(
  termId: string,
  academicYearId: string,
  entries: Array<{ studentId: string; payload: CbcReportPayload }>,
): Promise<string[]> {
  const studentIds = entries.map((e) => e.studentId);
  const { rows: existingRows } = await query<{
    id: string;
    student_id: string;
    is_approved: boolean;
    payload: unknown | null;
  }>(
    `SELECT id, student_id, is_approved, payload
     FROM cbc_report_cards
     WHERE term_id = $1 AND student_id = ANY($2::uuid[])`,
    [termId, studentIds],
  );
  const existingByStudent = new Map(existingRows.map((r) => [r.student_id, r]));

  const toUpdate: Array<{ id: string; payload: CbcReportPayload }> = [];
  const toInsert: Array<{ studentId: string; payload: CbcReportPayload }> = [];

  for (const entry of entries) {
    const existing = existingByStudent.get(entry.studentId);
    const incomingExamId = examIdFromPayload(entry.payload);
    if (existing?.is_approved && examIdFromPayload(existing.payload) === incomingExamId) {
      throw new HttpError(
        400,
        `Report for ${entry.payload.studentName} is already approved. Unlock or create a new term before regenerating.`,
      );
    }
    if (existing) {
      toUpdate.push({ id: existing.id, payload: entry.payload });
    } else {
      toInsert.push({ studentId: entry.studentId, payload: entry.payload });
    }
  }

  const reportIds: string[] = [];

  for (let i = 0; i < toUpdate.length; i += BULK_CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + BULK_CHUNK_SIZE);
    const ids = chunk.map((c) => c.id);
    const payloads = chunk.map((c) => JSON.stringify(c.payload));
    const teacherComments = chunk.map((c) => c.payload.teacherComment || null);
    const headComments = chunk.map((c) => c.payload.headteacherComment || null);

    await query(
      `UPDATE cbc_report_cards cr
       SET academic_year_id = $2,
           payload = u.payload::jsonb,
           computed_at = NOW(),
           updated_at = NOW(),
           is_approved = false,
           approved_by = NULL,
           approved_at = NULL,
           teacher_comment = COALESCE(u.teacher_comment, cr.teacher_comment),
           headteacher_comment = COALESCE(u.headteacher_comment, cr.headteacher_comment)
       FROM UNNEST($1::uuid[], $3::jsonb[], $4::text[], $5::text[]) AS u(id, payload, teacher_comment, headteacher_comment)
       WHERE cr.id = u.id`,
      [ids, academicYearId, payloads, teacherComments, headComments],
    );
    reportIds.push(...ids);
  }

  for (let i = 0; i < toInsert.length; i += BULK_CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + BULK_CHUNK_SIZE);
    const studentIdsChunk = chunk.map((c) => c.studentId);
    const payloads = chunk.map((c) => JSON.stringify(c.payload));
    const teacherComments = chunk.map((c) => c.payload.teacherComment || null);
    const headComments = chunk.map((c) => c.payload.headteacherComment || null);

    const { rows } = await query<{ id: string }>(
      `INSERT INTO cbc_report_cards (
         student_id, term_id, academic_year_id, payload, computed_at,
         teacher_comment, headteacher_comment, updated_at
       )
       SELECT u.student_id, $2, $3, u.payload::jsonb, NOW(), u.teacher_comment, u.headteacher_comment, NOW()
       FROM UNNEST($1::uuid[], $4::jsonb[], $5::text[], $6::text[]) AS u(student_id, payload, teacher_comment, headteacher_comment)
       RETURNING id`,
      [studentIdsChunk, termId, academicYearId, payloads, teacherComments, headComments],
    );
    reportIds.push(...rows.map((r) => r.id));
  }

  return reportIds;
}

async function bulkUpsertAlevelReports(
  termId: string,
  academicYearId: string,
  entries: Array<{ studentId: string; payload: AlevelReportPayload }>,
): Promise<string[]> {
  const studentIds = entries.map((e) => e.studentId);
  const { rows: existingRows } = await query<{
    id: string;
    student_id: string;
    is_approved: boolean;
    payload: unknown | null;
  }>(
    `SELECT id, student_id, is_approved, payload
     FROM alevel_results
     WHERE term_id = $1 AND student_id = ANY($2::uuid[])`,
    [termId, studentIds],
  );
  const existingByStudent = new Map(existingRows.map((r) => [r.student_id, r]));

  const { rows: comboRows } = await query<{ id: string; combination_id: string | null }>(
    `SELECT id, combination_id FROM students WHERE id = ANY($1::uuid[])`,
    [studentIds],
  );
  const comboByStudent = new Map(comboRows.map((r) => [r.id, r.combination_id]));

  const toUpdate: Array<{ id: string; studentId: string; payload: AlevelReportPayload }> = [];
  const toInsert: Array<{ studentId: string; payload: AlevelReportPayload }> = [];

  for (const entry of entries) {
    const existing = existingByStudent.get(entry.studentId);
    const incomingExamId = examIdFromPayload(entry.payload);
    if (existing?.is_approved && examIdFromPayload(existing.payload) === incomingExamId) {
      throw new HttpError(
        400,
        `Report for ${entry.payload.studentName} is already approved. You cannot overwrite an approved report card.`,
      );
    }
    if (existing) {
      toUpdate.push({ id: existing.id, studentId: entry.studentId, payload: entry.payload });
    } else {
      toInsert.push({ studentId: entry.studentId, payload: entry.payload });
    }
  }

  const reportIds: string[] = [];

  for (let i = 0; i < toUpdate.length; i += BULK_CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + BULK_CHUNK_SIZE);
    const ids = chunk.map((c) => c.id);
    const totals = chunk.map((c) => c.payload.totalPoints);
    const divisions = chunk.map((c) => c.payload.division);
    const payloads = chunk.map((c) => JSON.stringify(c.payload));
    const teacherComments = chunk.map((c) => c.payload.teacherComment || null);
    const headRemarks = chunk.map((c) => c.payload.headteacherRemark || null);

    await query(
      `UPDATE alevel_results ar
       SET academic_year_id = $2,
           total_points = u.total_points,
           division = u.division,
           payload = u.payload::jsonb,
           computed_at = NOW(),
           updated_at = NOW(),
           is_approved = false,
           approved_by = NULL,
           approved_at = NULL,
           teacher_comment = COALESCE(u.teacher_comment, ar.teacher_comment),
           headteacher_remark = COALESCE(u.headteacher_remark, ar.headteacher_remark)
       FROM UNNEST($1::uuid[], $3::int[], $4::text[], $5::jsonb[], $6::text[], $7::text[])
         AS u(id, total_points, division, payload, teacher_comment, headteacher_remark)
       WHERE ar.id = u.id`,
      [ids, academicYearId, totals, divisions, payloads, teacherComments, headRemarks],
    );
    reportIds.push(...ids);
    await bulkSyncDivisionSummaries(
      termId,
      academicYearId,
      chunk.map((c) => ({
        studentId: c.studentId,
        combinationId: comboByStudent.get(c.studentId) ?? null,
        totalPoints: c.payload.totalPoints,
        division: c.payload.division,
      })),
    );
  }

  for (let i = 0; i < toInsert.length; i += BULK_CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + BULK_CHUNK_SIZE);
    const studentIdsChunk = chunk.map((c) => c.studentId);
    const totals = chunk.map((c) => c.payload.totalPoints);
    const divisions = chunk.map((c) => c.payload.division);
    const payloads = chunk.map((c) => JSON.stringify(c.payload));
    const teacherComments = chunk.map((c) => c.payload.teacherComment || null);
    const headRemarks = chunk.map((c) => c.payload.headteacherRemark || null);

    const { rows } = await query<{ id: string; student_id: string }>(
      `INSERT INTO alevel_results (
         student_id, term_id, academic_year_id, total_points, division,
         payload, computed_at, teacher_comment, headteacher_remark, updated_at
       )
       SELECT u.student_id, $2, $3, u.total_points, u.division, u.payload::jsonb,
              NOW(), u.teacher_comment, u.headteacher_remark, NOW()
       FROM UNNEST($1::uuid[], $4::int[], $5::text[], $6::jsonb[], $7::text[], $8::text[])
         AS u(student_id, total_points, division, payload, teacher_comment, headteacher_remark)
       RETURNING id, student_id`,
      [studentIdsChunk, termId, academicYearId, totals, divisions, payloads, teacherComments, headRemarks],
    );
    reportIds.push(...rows.map((r) => r.id));
    await bulkSyncDivisionSummaries(
      termId,
      academicYearId,
      chunk.map((c) => ({
        studentId: c.studentId,
        combinationId: comboByStudent.get(c.studentId) ?? null,
        totalPoints: c.payload.totalPoints,
        division: c.payload.division,
      })),
    );
  }

  return reportIds;
}

async function bulkSyncDivisionSummaries(
  termId: string,
  academicYearId: string,
  rows: Array<{
    studentId: string;
    combinationId: string | null;
    totalPoints: number;
    division: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const studentIds = rows.map((r) => r.studentId);
  const combinationIds = rows.map((r) => r.combinationId);
  const totalPoints = rows.map((r) => r.totalPoints);
  const divisions = rows.map((r) => r.division);

  await query(
    `INSERT INTO student_division_summary (
       student_id, term_id, academic_year_id, combination_id, total_points, division, updated_at
     )
     SELECT u.student_id, $2, $3, u.combination_id, u.total_points, u.division, NOW()
     FROM UNNEST($1::uuid[], $4::uuid[], $5::int[], $6::text[])
       AS u(student_id, combination_id, total_points, division)
     ON CONFLICT (student_id, term_id, academic_year_id) DO UPDATE SET
       combination_id = EXCLUDED.combination_id,
       total_points = EXCLUDED.total_points,
       division = EXCLUDED.division,
       updated_at = NOW()`,
    [studentIds, termId, academicYearId, combinationIds, totalPoints, divisions],
  );
}
