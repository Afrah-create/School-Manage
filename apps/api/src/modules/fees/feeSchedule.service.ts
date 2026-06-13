import type { FeeScheduleBulkPublishInput, FeeScheduleClassTermInput } from "@uganda-cbc-sms/shared";
import type { PoolClient } from "pg";
import { query, withTransaction } from "../../config/db";
import { HttpError } from "../../utils/httpError";

export type ScheduleStatus = "draft" | "published" | "billed";

type ReleaseRow = {
  id: string;
  class_id: string;
  term_id: string;
  status: ScheduleStatus;
  published_at: Date | null;
  billed_at: Date | null;
  class_name: string;
  class_stream: string | null;
  term_label: string;
  year_name: string;
  category_count: string;
  total_per_student: string;
  active_student_count: string;
  invoiced_student_count: string;
};

async function structureTotals(classId: string, termId: string) {
  const { rows } = await query<{ category_count: string; total: string }>(
    `SELECT COUNT(*)::text AS category_count,
            COALESCE(SUM(amount), 0)::text AS total
     FROM fee_structures WHERE class_id = $1 AND term_id = $2`,
    [classId, termId],
  );
  return {
    categoryCount: Number(rows[0]?.category_count ?? 0),
    totalPerStudent: rows[0]?.total ?? "0",
  };
}

async function activeStudentCount(classId: string): Promise<number> {
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM students WHERE class_id = $1 AND status = 'active'`,
    [classId],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function hasInvoicesForClassTerm(classId: string, termId: string): Promise<boolean> {
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM fee_invoices fi
     JOIN students s ON s.id = fi.student_id
     WHERE s.class_id = $1 AND fi.term_id = $2 AND fi.total_amount > 0`,
    [classId, termId],
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

export async function getReleaseRow(
  classId: string,
  termId: string,
): Promise<ReleaseRow | null> {
  const { rows } = await query<ReleaseRow>(
    `SELECT r.id, r.class_id, r.term_id, r.status, r.published_at, r.billed_at,
            c.name AS class_name, c.stream AS class_stream,
            CONCAT('Term ', t.term_number::text) AS term_label,
            ay.name AS year_name,
            (SELECT COUNT(*)::text FROM fee_structures fs
             WHERE fs.class_id = r.class_id AND fs.term_id = r.term_id) AS category_count,
            (SELECT COALESCE(SUM(amount), 0)::text FROM fee_structures fs
             WHERE fs.class_id = r.class_id AND fs.term_id = r.term_id) AS total_per_student,
            (SELECT COUNT(*)::text FROM students s
             WHERE s.class_id = r.class_id AND s.status = 'active') AS active_student_count,
            (SELECT COUNT(DISTINCT fi.student_id)::text FROM fee_invoices fi
             JOIN students s ON s.id = fi.student_id
             WHERE s.class_id = r.class_id AND fi.term_id = r.term_id AND fi.total_amount > 0) AS invoiced_student_count
     FROM fee_schedule_releases r
     JOIN classes c ON c.id = r.class_id
     JOIN terms t ON t.id = r.term_id
     JOIN academic_years ay ON ay.id = t.academic_year_id
     WHERE r.class_id = $1 AND r.term_id = $2`,
    [classId, termId],
  );
  return rows[0] ?? null;
}

export async function getEffectiveStatus(classId: string, termId: string): Promise<ScheduleStatus> {
  if (await hasInvoicesForClassTerm(classId, termId)) return "billed";
  const row = await getReleaseRow(classId, termId);
  if (row) return row.status;
  const { categoryCount } = await structureTotals(classId, termId);
  return categoryCount > 0 ? "draft" : "draft";
}

export async function ensureDraftRelease(classId: string, termId: string, client?: PoolClient) {
  const run = client
    ? (sql: string, params: unknown[]) => client.query(sql, params)
    : (sql: string, params: unknown[]) => query(sql, params);

  const existing = await getReleaseRow(classId, termId);
  if (existing) {
    if (existing.status === "billed") return;
    return;
  }
  await run(
    `INSERT INTO fee_schedule_releases (class_id, term_id, status)
     VALUES ($1, $2, 'draft')
     ON CONFLICT (class_id, term_id) DO NOTHING`,
    [classId, termId],
  );
}

export async function assertStructureEditable(classId: string, termId: string) {
  const status = await getEffectiveStatus(classId, termId);
  if (status === "published") {
    throw new HttpError(
      409,
      "This fee schedule is published. Unpublish it before changing categories, or bill students first.",
    );
  }
  if (status === "billed") {
    throw new HttpError(
      409,
      "Invoices have been issued for this class and term. Fee categories can no longer be changed.",
    );
  }
}

function mapRelease(row: ReleaseRow) {
  return {
    id: row.id,
    classId: row.class_id,
    termId: row.term_id,
    status: row.status,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    billedAt: row.billed_at ? new Date(row.billed_at).toISOString() : null,
    className: row.class_name,
    classStream: row.class_stream,
    termLabel: row.term_label,
    yearName: row.year_name,
    categoryCount: Number(row.category_count),
    totalPerStudent: row.total_per_student,
    activeStudentCount: Number(row.active_student_count),
    invoicedStudentCount: Number(row.invoiced_student_count),
  };
}

export async function buildReleaseSummary(classId: string, termId: string) {
  let row = await getReleaseRow(classId, termId);
  const totals = await structureTotals(classId, termId);
  const students = await activeStudentCount(classId);
  const invoiced = await hasInvoicesForClassTerm(classId, termId);

  if (!row && totals.categoryCount > 0) {
    await ensureDraftRelease(classId, termId);
    row = await getReleaseRow(classId, termId);
  }

  const { rows: classMeta } = await query<{
    class_name: string;
    class_stream: string | null;
    term_label: string;
    year_name: string;
  }>(
    `SELECT c.name AS class_name, c.stream AS class_stream,
            CONCAT('Term ', t.term_number::text) AS term_label,
            ay.name AS year_name
     FROM classes c
     JOIN terms t ON t.id = $2
     JOIN academic_years ay ON ay.id = t.academic_year_id
     WHERE c.id = $1`,
    [classId, termId],
  );
  const meta = classMeta[0];

  let status: ScheduleStatus = row?.status ?? (totals.categoryCount > 0 ? "draft" : "draft");
  if (invoiced) status = "billed";

  return {
    id: row?.id ?? "",
    classId,
    termId,
    status,
    publishedAt: row?.published_at ? new Date(row.published_at).toISOString() : null,
    billedAt: row?.billed_at ? new Date(row.billed_at).toISOString() : null,
    className: meta?.class_name,
    classStream: meta?.class_stream ?? null,
    termLabel: meta?.term_label,
    yearName: meta?.year_name,
    categoryCount: totals.categoryCount,
    totalPerStudent: totals.totalPerStudent,
    activeStudentCount: students,
    invoicedStudentCount: row ? Number(row.invoiced_student_count) : invoiced ? students : 0,
  };
}

export async function listScheduleReleases(filters?: { classId?: string; termId?: string }) {
  const clauses: string[] = [];
  const params: string[] = [];
  if (filters?.classId) {
    params.push(filters.classId);
    clauses.push(`r.class_id = $${params.length}`);
  }
  if (filters?.termId) {
    params.push(filters.termId);
    clauses.push(`r.term_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await query<ReleaseRow>(
    `SELECT r.id, r.class_id, r.term_id, r.status, r.published_at, r.billed_at,
            c.name AS class_name, c.stream AS class_stream,
            CONCAT('Term ', t.term_number::text) AS term_label,
            ay.name AS year_name,
            (SELECT COUNT(*)::text FROM fee_structures fs
             WHERE fs.class_id = r.class_id AND fs.term_id = r.term_id) AS category_count,
            (SELECT COALESCE(SUM(amount), 0)::text FROM fee_structures fs
             WHERE fs.class_id = r.class_id AND fs.term_id = r.term_id) AS total_per_student,
            (SELECT COUNT(*)::text FROM students s
             WHERE s.class_id = r.class_id AND s.status = 'active') AS active_student_count,
            (SELECT COUNT(DISTINCT fi.student_id)::text FROM fee_invoices fi
             JOIN students s ON s.id = fi.student_id
             WHERE s.class_id = r.class_id AND fi.term_id = r.term_id AND fi.total_amount > 0) AS invoiced_student_count
     FROM fee_schedule_releases r
     JOIN classes c ON c.id = r.class_id
     JOIN terms t ON t.id = r.term_id
     JOIN academic_years ay ON ay.id = t.academic_year_id
     ${where}
     ORDER BY ay.name DESC, t.term_number, c.name, c.stream`,
    params,
  );
  return rows.map(mapRelease);
}

export async function publishSchedule(input: FeeScheduleClassTermInput, userId: string) {
  const totals = await structureTotals(input.classId, input.termId);
  if (totals.categoryCount === 0) {
    throw new HttpError(
      400,
      "Add at least one fee category before publishing the schedule for this class and term.",
    );
  }
  if (await hasInvoicesForClassTerm(input.classId, input.termId)) {
    throw new HttpError(409, "Students have already been billed for this class and term.");
  }

  await ensureDraftRelease(input.classId, input.termId);
  await query(
    `INSERT INTO fee_schedule_releases (class_id, term_id, status, published_at, published_by, updated_at)
     VALUES ($1, $2, 'published', NOW(), $3, NOW())
     ON CONFLICT (class_id, term_id) DO UPDATE SET
       status = 'published',
       published_at = COALESCE(fee_schedule_releases.published_at, NOW()),
       published_by = COALESCE(fee_schedule_releases.published_by, EXCLUDED.published_by),
       updated_at = NOW()`,
    [input.classId, input.termId, userId],
  );
  return buildReleaseSummary(input.classId, input.termId);
}

export async function unpublishSchedule(input: FeeScheduleClassTermInput) {
  if (await hasInvoicesForClassTerm(input.classId, input.termId)) {
    throw new HttpError(
      409,
      "Cannot unpublish after invoices have been created. Fee categories are locked for this term.",
    );
  }
  const row = await getReleaseRow(input.classId, input.termId);
  if (!row || row.status !== "published") {
    throw new HttpError(400, "This schedule is not published.");
  }
  await query(
    `UPDATE fee_schedule_releases SET status = 'draft', published_at = NULL, published_by = NULL, updated_at = NOW()
     WHERE class_id = $1 AND term_id = $2`,
    [input.classId, input.termId],
  );
  return buildReleaseSummary(input.classId, input.termId);
}

export async function assertPublishedForBilling(classId: string, termId: string) {
  const summary = await buildReleaseSummary(classId, termId);
  if (summary.categoryCount === 0) {
    throw new HttpError(
      400,
      "No fee schedule exists for this class and term. Ask an administrator to configure and publish it first.",
    );
  }
  if (summary.status === "draft") {
    throw new HttpError(
      400,
      "This fee schedule is still in draft. An administrator must publish it before you can bill students.",
    );
  }
  return summary;
}

export async function markScheduleBilled(
  classId: string,
  termId: string,
  userId: string,
  client?: PoolClient,
) {
  const run = client
    ? (sql: string, params: unknown[]) => client.query(sql, params)
    : (sql: string, params: unknown[]) => query(sql, params);

  await run(
    `INSERT INTO fee_schedule_releases (class_id, term_id, status, billed_at, billed_by, updated_at)
     VALUES ($1, $2, 'billed', NOW(), $3, NOW())
     ON CONFLICT (class_id, term_id) DO UPDATE SET
       status = 'billed',
       billed_at = COALESCE(fee_schedule_releases.billed_at, NOW()),
       billed_by = COALESCE(fee_schedule_releases.billed_by, EXCLUDED.billed_by),
       updated_at = NOW()`,
    [classId, termId, userId],
  );
}

export async function previewBulkInvoices(input: FeeScheduleClassTermInput) {
  const summary = await buildReleaseSummary(input.classId, input.termId);
  if (summary.categoryCount === 0) {
    throw new HttpError(400, "No fee structure is configured for this class and term.");
  }

  const { rows: students } = await query<{
    id: string;
    full_name: string;
    student_number: string;
    has_invoice: boolean;
  }>(
    `SELECT s.id, s.full_name, s.student_number,
            EXISTS (
              SELECT 1 FROM fee_invoices fi
              WHERE fi.student_id = s.id AND fi.term_id = $2 AND fi.total_amount > 0
            ) AS has_invoice
     FROM students s
     WHERE s.class_id = $1 AND s.status = 'active'
     ORDER BY s.student_number`,
    [input.classId, input.termId],
  );

  let wouldCreate = 0;
  let wouldSkip = 0;
  let alreadyInvoiced = 0;
  const mapped = students.map((s) => {
    if (s.has_invoice) {
      wouldSkip += 1;
      alreadyInvoiced += 1;
    } else {
      wouldCreate += 1;
    }
    return {
      studentId: s.id,
      studentName: s.full_name,
      studentNumber: s.student_number,
      hasInvoice: s.has_invoice,
    };
  });

  return {
    classId: input.classId,
    termId: input.termId,
    scheduleStatus: summary.status,
    totalPerStudent: summary.totalPerStudent,
    categoryCount: summary.categoryCount,
    activeStudentCount: students.length,
    wouldCreate,
    wouldSkip,
    alreadyInvoiced,
    students: mapped,
  };
}

export async function bulkPublishSchedules(input: FeeScheduleBulkPublishInput, userId: string) {
  let classIds = input.classIds ?? [];
  if (input.allDrafts || !classIds.length) {
    const { rows } = await query<{ class_id: string }>(
      `SELECT class_id FROM fee_schedule_releases
       WHERE term_id = $1::uuid AND status = 'draft'`,
      [input.termId],
    );
    classIds = rows.map((r) => r.class_id);
  }

  const published: string[] = [];
  const errors: Array<{ classId: string; message: string }> = [];

  for (const classId of classIds) {
    try {
      await publishSchedule({ classId, termId: input.termId }, userId);
      published.push(classId);
    } catch (e) {
      errors.push({
        classId,
        message: e instanceof HttpError ? e.message : "Publish failed",
      });
    }
  }

  return { publishedCount: published.length, published, errors };
}
