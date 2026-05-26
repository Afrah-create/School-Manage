import type {
  ClassEnrollmentSummary,
  CreateStudentInput,
  PaginatedStudents,
  PromoteStudentsInput,
  StudentBrowseQuery,
  UpdateStudentInput,
  WithdrawStudentInput,
} from "@uganda-cbc-sms/shared";
import type { Role } from "@uganda-cbc-sms/shared";
import type { PoolClient } from "pg";
import { pool, query, withTransaction } from "../../config/db";
import { formatDateOnly } from "../../utils/dateOnly";
import { HttpError } from "../../utils/httpError";
import { nextSequence, padNumber } from "../../utils/sequences";

function mapStudent(r: Record<string, unknown>) {
  const enrolled =
    r.enrolled_at != null
      ? new Date(r.enrolled_at as string).toISOString()
      : new Date((r.created_at as string | undefined) ?? Date.now()).toISOString();
  return {
    id: r.id as string,
    studentNumber: r.student_number as string,
    fullName: r.full_name as string,
    dateOfBirth: formatDateOnly(r.date_of_birth),
    gender: r.gender as "male" | "female",
    guardianName: r.guardian_name as string,
    guardianContact: r.guardian_contact as string,
    guardianEmail: (r.guardian_email as string | null | undefined) ?? null,
    address: (r.address as string | null | undefined) ?? null,
    previousSchool: (r.previous_school as string | null | undefined) ?? null,
    classId: r.class_id as string | null,
    className: (r.class_name as string | null | undefined) ?? null,
    classStream: (r.class_stream as string | null | undefined) ?? null,
    combinationId: r.combination_id as string | null,
    photoUrl: r.photo_url as string | null,
    status: r.status as "active" | "transferred" | "withdrawn",
    transferReason: r.transfer_reason as string | null,
    enrolledAt: enrolled,
  };
}

async function resolveInvoiceTerm(client: Pick<PoolClient, "query">): Promise<string | null> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM terms WHERE is_active = true LIMIT 1`,
  );
  if (rows[0]) return rows[0].id;
  const r2 = await client.query<{ id: string }>(
    `SELECT id FROM terms ORDER BY end_date DESC LIMIT 1`,
  );
  return r2.rows[0]?.id ?? null;
}

export async function createStudent(input: CreateStudentInput) {
  try {
    return await withTransaction(async (client: PoolClient) => {
      const year = new Date().getFullYear();
      const seqKey = `student_${year}`;
      const n = await nextSequence(client, seqKey);
      const studentNumber = `SMS-${year}-${padNumber(n, 5)}`;

      const { rows } = await client.query(
        `INSERT INTO students (
          student_number, full_name, date_of_birth, gender, guardian_name, guardian_contact,
          class_id, combination_id, guardian_email, address, previous_school
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          studentNumber,
          input.fullName,
          input.dateOfBirth,
          input.gender,
          input.guardianName,
          input.guardianContact,
          input.classId,
          input.combinationId ?? null,
          input.guardianEmail ?? null,
          input.address ?? null,
          input.previousSchool ?? null,
        ],
      );
      const student = rows[0]!;
      const termId = await resolveInvoiceTerm(client);
      if (termId && input.classId) {
        const sum = await client.query<{ tot: string }>(
          `SELECT COALESCE(SUM(amount), 0)::text AS tot FROM fee_structures WHERE class_id = $1 AND term_id = $2`,
          [input.classId, termId],
        );
        const total = sum.rows[0]?.tot ?? "0";
        await client.query(
          `INSERT INTO fee_invoices (student_id, term_id, total_amount, amount_paid)
           VALUES ($1, $2, $3::numeric, 0)`,
          [student.id, termId, total],
        );
      }
      return mapStudent(student as never);
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") throw new HttpError(400, "Duplicate student number");
    throw new Error(e instanceof Error ? e.message : "Could not enrol student");
  }
}

const TEACHER_STUDENT_ACCESS_SQL = ` AND (
    EXISTS (
      SELECT 1 FROM class_teacher_assignments cta
      WHERE cta.class_id = s.class_id AND cta.teacher_id = $1
    )
    OR EXISTS (
      SELECT 1 FROM class_subjects cs
      WHERE cs.class_id = s.class_id AND cs.teacher_id = $1
    )
    OR EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = s.class_id AND c.class_teacher_id = $1
    )
  )`;

function listWhereClause(
  role: Role,
  userId: string,
  classId?: string,
): { sql: string; params: string[] } {
  if (role === "admin" || role === "headteacher" || role === "bursar") {
    if (classId) return { sql: " AND s.class_id = $1", params: [classId] };
    return { sql: "", params: [] };
  }
  if (role === "class_teacher" || role === "subject_teacher") {
    const params = [userId];
    let sql = TEACHER_STUDENT_ACCESS_SQL;
    if (classId) {
      sql += ` AND s.class_id = $2`;
      params.push(classId);
    }
    return { sql, params };
  }
  return { sql: " AND false", params: [] };
}

async function teacherMayViewClass(role: Role, userId: string, classId: string): Promise<boolean> {
  if (role === "admin" || role === "headteacher" || role === "bursar") return true;
  if (role === "class_teacher" || role === "subject_teacher") {
    const { rows } = await query(
      `SELECT 1
       WHERE EXISTS (
         SELECT 1 FROM class_teacher_assignments cta
         WHERE cta.class_id = $2 AND cta.teacher_id = $1
       )
       OR EXISTS (
         SELECT 1 FROM class_subjects cs
         WHERE cs.class_id = $2 AND cs.teacher_id = $1
       )
       OR EXISTS (
         SELECT 1 FROM classes c WHERE c.id = $2 AND c.class_teacher_id = $1
       )`,
      [userId, classId],
    );
    return rows.length > 0;
  }
  return false;
}

export async function listStudents(role: Role, userId: string, classId?: string) {
  try {
    if (classId && !(await teacherMayViewClass(role, userId, classId))) {
      throw new HttpError(403, "You are not assigned to this class");
    }
    const { sql: extra, params } = listWhereClause(role, userId, classId);
    const { rows } = await query(
      `SELECT s.*, c.name AS class_name, c.stream AS class_stream
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.status = 'active' ${extra}
       ORDER BY c.name NULLS LAST, c.stream NULLS LAST, s.full_name`,
      params,
    );
    return rows.map((r) => mapStudent(r as never));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not list students");
  }
}

export async function canViewStudent(id: string, role: Role, userId: string): Promise<boolean> {
  if (role === "admin" || role === "headteacher" || role === "bursar") {
    const { rows } = await query(`SELECT 1 FROM students WHERE id = $1`, [id]);
    return rows.length > 0;
  }
  if (role === "class_teacher" || role === "subject_teacher") {
    const { rows } = await query(
      `SELECT 1 FROM students s
       WHERE s.id = $1
         AND (
           EXISTS (
             SELECT 1 FROM class_teacher_assignments cta
             WHERE cta.class_id = s.class_id AND cta.teacher_id = $2
           )
           OR EXISTS (
             SELECT 1 FROM class_subjects cs
             WHERE cs.class_id = s.class_id AND cs.teacher_id = $2
           )
           OR EXISTS (
             SELECT 1 FROM classes c
             WHERE c.id = s.class_id AND c.class_teacher_id = $2
           )
         )`,
      [id, userId],
    );
    return rows.length > 0;
  }
  return false;
}

export async function getStudent(id: string, role: Role, userId: string) {
  try {
    const { rows } = await query(
      `SELECT s.*, c.name AS class_name, c.stream AS class_stream
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = $1`,
      [id],
    );
    if (rows.length === 0) throw new HttpError(404, "Student not found");
    const ok = await canViewStudent(id, role, userId);
    if (!ok) throw new HttpError(403, "Forbidden");
    return mapStudent(rows[0] as never);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not load student");
  }
}

export async function updatePhoto(studentId: string, relativeUrl: string) {
  try {
    const r = await query(
      `UPDATE students SET photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [relativeUrl, studentId],
    );
    if (r.rowCount === 0) throw new HttpError(404, "Student not found");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not update photo");
  }
}

export async function promoteStudents(input: PromoteStudentsInput) {
  try {
    await query(`UPDATE students SET class_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`, [
      input.targetClassId,
      input.studentIds,
    ]);
    return { promoted: input.studentIds.length };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not promote students");
  }
}

export async function updateStudent(id: string, role: Role, userId: string, input: UpdateStudentInput) {
  await getStudent(id, role, userId);

  const colMap: Record<string, string> = {
    fullName: "full_name",
    dateOfBirth: "date_of_birth",
    gender: "gender",
    guardianName: "guardian_name",
    guardianContact: "guardian_contact",
    classId: "class_id",
    combinationId: "combination_id",
    status: "status",
    transferReason: "transfer_reason",
    guardianEmail: "guardian_email",
    address: "address",
    previousSchool: "previous_school",
  };

  const payload = { ...input } as Record<string, unknown>;
  if (payload["status"] === "active") {
    payload["transferReason"] = null;
  }

  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (entries.length === 0) throw new HttpError(400, "No fields to update");

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [key, val] of entries) {
    const col = colMap[key];
    if (!col) continue;
    sets.push(`${col} = $${i}`);
    vals.push(val);
    i += 1;
  }
  if (sets.length === 0) throw new HttpError(400, "No fields to update");

  vals.push(id);
  try {
    const { rows } = await query(
      `UPDATE students SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      vals,
    );
    if (rows.length === 0) throw new HttpError(404, "Student not found");
    return mapStudent(rows[0] as never);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not update student");
  }
}

export async function deleteStudent(id: string, role: Role, userId: string) {
  await getStudent(id, role, userId);
  try {
    await withTransaction(async (client: PoolClient) => {
      await client.query(
        `DELETE FROM fee_payments
         WHERE student_id = $1 OR invoice_id IN (SELECT id FROM fee_invoices WHERE student_id = $1)`,
        [id],
      );
      await client.query(`DELETE FROM fee_invoices WHERE student_id = $1`, [id]);
      await client.query(`DELETE FROM cbc_scores WHERE student_id = $1`, [id]);
      await client.query(`DELETE FROM cbc_report_cards WHERE student_id = $1`, [id]);
      await client.query(`DELETE FROM alevel_scores WHERE student_id = $1`, [id]);
      await client.query(`DELETE FROM alevel_results WHERE student_id = $1`, [id]);
      await client.query(`DELETE FROM attendance WHERE student_id = $1`, [id]);
      const r = await client.query(`DELETE FROM students WHERE id = $1`, [id]);
      if (r.rowCount === 0) throw new HttpError(404, "Student not found");
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not delete student");
  }
}

export async function withdrawStudent(id: string, input: WithdrawStudentInput) {
  try {
    const r = await query(
      `UPDATE students SET status = 'withdrawn', transfer_reason = $1, updated_at = NOW() WHERE id = $2`,
      [input.reason, id],
    );
    if (r.rowCount === 0) throw new HttpError(404, "Student not found");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not withdraw student");
  }
}

export async function browseStudents(
  role: Role,
  userId: string,
  input: StudentBrowseQuery,
): Promise<PaginatedStudents> {
  const classFilter = input.classId?.trim();
  const isUnassigned = classFilter === "unassigned";
  if (classFilter && !isUnassigned) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(classFilter)) {
      throw new HttpError(400, "Invalid class filter");
    }
    if (!(await teacherMayViewClass(role, userId, classFilter))) {
      throw new HttpError(403, "You are not assigned to this class");
    }
  }

  const page = input.page;
  const limit = input.limit;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const filterParams: unknown[] = [];

  const push = (sql: string, ...vals: unknown[]) => {
    conditions.push(sql);
    filterParams.push(...vals);
  };

  if (role === "class_teacher" || role === "subject_teacher") {
    const p = filterParams.length + 1;
    push(
      `(
        EXISTS (
          SELECT 1 FROM class_teacher_assignments cta
          WHERE cta.class_id = s.class_id AND cta.teacher_id = $${p}
        )
        OR EXISTS (
          SELECT 1 FROM class_subjects cs
          WHERE cs.class_id = s.class_id AND cs.teacher_id = $${p}
        )
        OR EXISTS (
          SELECT 1 FROM classes c0
          WHERE c0.id = s.class_id AND c0.class_teacher_id = $${p}
        )
      )`,
      userId,
    );
  }

  if (isUnassigned) {
    push("s.class_id IS NULL");
  } else if (classFilter) {
    push(`s.class_id = $${filterParams.length + 1}`, classFilter);
  }

  if (input.status !== "all") {
    push(`s.status = $${filterParams.length + 1}`, input.status);
  }

  const q = input.q?.trim();
  if (q) {
    const p = filterParams.length + 1;
    push(`(s.full_name ILIKE $${p} OR s.student_number ILIKE $${p})`, `%${q}%`);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy =
    input.sort === "number"
      ? "s.student_number ASC, s.full_name ASC"
      : "s.full_name ASC, s.student_number ASC";

  const countSql = `SELECT COUNT(*)::int AS c FROM students s ${whereSql}`;

  const dataSql = `
    SELECT s.*, c.name AS class_name, c.stream AS class_stream
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`;

  const countParams = [...filterParams];
  const dataParams = [...filterParams, limit, offset];

  const [{ rows: countRows }, { rows }] = await Promise.all([
    query<{ c: number }>(countSql, countParams),
    query(dataSql, dataParams),
  ]);

  const total = countRows[0]?.c ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items: rows.map((r) => mapStudent(r as never)),
    page,
    limit,
    total,
    totalPages,
  };
}

export async function getClassEnrollmentSummary(
  role: Role,
  userId: string,
): Promise<ClassEnrollmentSummary[]> {
  if (role === "admin" || role === "headteacher" || role === "bursar") {
    const { rows } = await query<{
      class_id: string;
      class_name: string;
      class_stream: string | null;
      active_count: number;
      total_count: number;
    }>(
      `SELECT c.id AS class_id, c.name AS class_name, c.stream AS class_stream,
              COUNT(s.id) FILTER (WHERE s.status = 'active')::int AS active_count,
              COUNT(s.id)::int AS total_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       GROUP BY c.id, c.name, c.stream
       HAVING COUNT(s.id) > 0
       ORDER BY c.name, c.stream NULLS LAST`,
    );
    const mapped = rows.map((r) => ({
      classId: r.class_id,
      className: r.class_name,
      classStream: r.class_stream,
      activeCount: r.active_count,
      totalCount: r.total_count,
    }));
    const unassigned = await query<{ active_count: number; total_count: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
         COUNT(*)::int AS total_count
       FROM students WHERE class_id IS NULL`,
    );
    const u = unassigned.rows[0];
    if (u && u.total_count > 0) {
      mapped.push({
        classId: "unassigned",
        className: "Unassigned",
        classStream: null,
        activeCount: u.active_count,
        totalCount: u.total_count,
      });
    }
    return mapped;
  }

  if (role === "class_teacher" || role === "subject_teacher") {
    const { rows } = await query<{
      class_id: string;
      class_name: string;
      class_stream: string | null;
      active_count: number;
      total_count: number;
    }>(
      `SELECT c.id AS class_id, c.name AS class_name, c.stream AS class_stream,
              COUNT(s.id) FILTER (WHERE s.status = 'active')::int AS active_count,
              COUNT(s.id)::int AS total_count
       FROM classes c
       JOIN students s ON s.class_id = c.id
       WHERE (
         EXISTS (
           SELECT 1 FROM class_teacher_assignments cta
           WHERE cta.class_id = c.id AND cta.teacher_id = $1
         )
         OR EXISTS (
           SELECT 1 FROM class_subjects cs
           WHERE cs.class_id = c.id AND cs.teacher_id = $1
         )
         OR c.class_teacher_id = $1
       )
       GROUP BY c.id, c.name, c.stream
       ORDER BY c.name, c.stream NULLS LAST`,
      [userId],
    );
    return rows.map((r) => ({
      classId: r.class_id,
      className: r.class_name,
      classStream: r.class_stream,
      activeCount: r.active_count,
      totalCount: r.total_count,
    }));
  }

  return [];
}

export async function searchStudents(q: string, role: Role, userId: string) {
  try {
    const term = `%${q.trim()}%`;
    if (role === "admin" || role === "headteacher" || role === "bursar") {
      const { rows } = await query(
        `SELECT s.* FROM students s
         WHERE (s.full_name ILIKE $1 OR s.student_number ILIKE $2)
         ORDER BY s.student_number LIMIT 50`,
        [term, term],
      );
      return rows.map((r) => mapStudent(r as never));
    }
    if (role === "class_teacher") {
      const { rows } = await query(
        `SELECT s.* FROM students s
         WHERE (s.full_name ILIKE $1 OR s.student_number ILIKE $2)
         AND EXISTS (SELECT 1 FROM classes c WHERE c.id = s.class_id AND c.class_teacher_id = $3)
         ORDER BY s.student_number LIMIT 50`,
        [term, term, userId],
      );
      return rows.map((r) => mapStudent(r as never));
    }
    if (role === "subject_teacher") {
      const { rows } = await query(
        `SELECT s.* FROM students s
         WHERE (s.full_name ILIKE $1 OR s.student_number ILIKE $2)
         AND EXISTS (
           SELECT 1 FROM class_subjects cs WHERE cs.class_id = s.class_id AND cs.teacher_id = $3
         )
         ORDER BY s.student_number LIMIT 50`,
        [term, term, userId],
      );
      return rows.map((r) => mapStudent(r as never));
    }
    return [];
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Search failed");
  }
}

export { pool };
