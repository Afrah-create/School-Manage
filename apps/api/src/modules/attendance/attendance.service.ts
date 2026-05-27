import type {
  AttendanceAdminOverviewQuery,
  AttendanceInput,
  AttendanceRegisterRowInput,
  AttendanceRegisterSaveInput,
  AttendanceRangeQuery,
  Role,
} from "@uganda-cbc-sms/shared";
import { query, withTransaction } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { teacherCanAccessClassForAttendance } from "../../utils/teacherTeachingAccess";

type RegisterMeta = {
  registerId: string | null;
  status: "draft" | "submitted" | "locked";
  submittedAt: string | null;
};

export type AttendanceRegisterStudentRow = {
  studentId: string;
  studentName: string;
  studentNumber: string;
  status: "present" | "absent" | "late" | null;
};

export type AttendanceRegisterView = {
  classId: string;
  className: string;
  classStream: string;
  date: string;
  registerId: string | null;
  registerStatus: "draft" | "submitted" | "locked";
  submittedAt: string | null;
  students: AttendanceRegisterStudentRow[];
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    unmarked: number;
  };
};

export type AttendanceRangeDaySummary = {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  attendanceRate: number;
  registerStatus: "draft" | "submitted" | "locked";
};

export async function getAttendanceRegister(
  classId: string,
  date: string,
  role: Role,
  userId: string,
): Promise<AttendanceRegisterView> {
  const allowed = await teacherCanAccessClassForAttendance(userId, classId, role);
  if (!allowed) throw new HttpError(403, "You are not allowed to view attendance for this class");

  const [meta, classMeta, students] = await Promise.all([
    getRegisterMeta(classId, date),
    getClassMeta(classId),
    query<{
      student_id: string;
      student_name: string;
      student_number: string;
      status: "present" | "absent" | "late" | null;
    }>(
      `SELECT
         s.id AS student_id,
         s.full_name AS student_name,
         s.student_number AS student_number,
         a.status
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id = s.id
        AND a.class_id = $1
        AND a.date = $2
       WHERE s.class_id = $1
         AND s.status = 'active'
       ORDER BY s.student_number, s.full_name`,
      [classId, date],
    ),
  ]);

  const rows = students.rows.map((r) => ({
    studentId: r.student_id,
    studentName: r.student_name,
    studentNumber: r.student_number,
    status: r.status,
  }));
  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const late = rows.filter((r) => r.status === "late").length;
  const unmarked = rows.length - present - absent - late;

  return {
    classId,
    className: classMeta.name,
    classStream: classMeta.stream,
    date,
    registerId: meta.registerId,
    registerStatus: meta.status,
    submittedAt: meta.submittedAt,
    students: rows,
    summary: {
      total: rows.length,
      present,
      absent,
      late,
      unmarked,
    },
  };
}

export async function saveAttendanceRegister(
  input: AttendanceRegisterSaveInput,
  recordedBy: string,
  role: Role,
) {
  const allowed = await teacherCanAccessClassForAttendance(recordedBy, input.classId, role);
  if (!allowed) throw new HttpError(403, "You are not allowed to record attendance for this class");
  if (input.rows.length > 1000) {
    throw new HttpError(400, "Register is too large. Split the class and try again.");
  }

  const rosterIds = await loadActiveClassStudentIds(input.classId);
  const rosterSet = new Set(rosterIds);
  const invalidRows = input.rows.filter((r) => !rosterSet.has(r.studentId));
  if (invalidRows.length > 0) {
    throw new HttpError(
      400,
      `Some learners are not active in this class (${invalidRows.length} invalid row(s)). Refresh and retry.`,
    );
  }

  await withTransaction(async (client) => {
    const existing = await client.query<{ id: string; status: "draft" | "submitted" | "locked" }>(
      `SELECT id, status
       FROM attendance_registers
       WHERE class_id = $1 AND date = $2
       LIMIT 1`,
      [input.classId, input.date],
    );
    const row = existing.rows[0];
    if (row?.status === "locked" || row?.status === "submitted") {
      throw new HttpError(400, "This register is already submitted and cannot be edited.");
    }

    const register = await client.query<{ id: string }>(
      `INSERT INTO attendance_registers (class_id, date, status, recorded_by, updated_at)
       VALUES ($1, $2, 'draft', $3, NOW())
       ON CONFLICT (class_id, date) DO UPDATE
       SET recorded_by = EXCLUDED.recorded_by,
           updated_at = NOW()
       RETURNING id`,
      [input.classId, input.date, recordedBy],
    );
    const registerId = register.rows[0]!.id;
    const studentIds = input.rows.map((r) => r.studentId);
    const statuses = input.rows.map((r) => r.status);
    await client.query(
      `INSERT INTO attendance (student_id, class_id, date, status, recorded_by, register_id, updated_at)
       SELECT x.student_id, $1, $2, x.status, $3, $4, NOW()
       FROM unnest($5::uuid[], $6::text[]) AS x(student_id, status)
       ON CONFLICT (student_id, date) DO UPDATE
       SET status = EXCLUDED.status,
           class_id = EXCLUDED.class_id,
           recorded_by = EXCLUDED.recorded_by,
           register_id = EXCLUDED.register_id,
           updated_at = NOW()`,
      [input.classId, input.date, recordedBy, registerId, studentIds, statuses],
    );
  });

  return getAttendanceRegister(input.classId, input.date, role, recordedBy);
}

export async function submitAttendanceRegister(
  classId: string,
  date: string,
  userId: string,
  role: Role,
) {
  const allowed = await teacherCanAccessClassForAttendance(userId, classId, role);
  if (!allowed) throw new HttpError(403, "You are not allowed to submit attendance for this class");

  await withTransaction(async (client) => {
    const existing = await client.query<{ id: string; status: "draft" | "submitted" | "locked" }>(
      `SELECT id, status
       FROM attendance_registers
       WHERE class_id = $1 AND date = $2
       LIMIT 1`,
      [classId, date],
    );
    if (!existing.rows[0]) {
      await client.query(
        `INSERT INTO attendance_registers (class_id, date, status, recorded_by, submitted_at, updated_at)
         VALUES ($1, $2, 'submitted', $3, NOW(), NOW())`,
        [classId, date, userId],
      );
      return;
    }
    if (existing.rows[0].status === "locked") {
      throw new HttpError(400, "This register is locked.");
    }
    await client.query(
      `UPDATE attendance_registers
       SET status = 'submitted',
           recorded_by = $3,
           submitted_at = COALESCE(submitted_at, NOW()),
           updated_at = NOW()
       WHERE class_id = $1
         AND date = $2`,
      [classId, date, userId],
    );
  });

  return getAttendanceRegister(classId, date, role, userId);
}

export async function getAttendanceRange(
  filters: AttendanceRangeQuery,
  role: Role,
  userId: string,
): Promise<AttendanceRangeDaySummary[]> {
  const allowed = await teacherCanAccessClassForAttendance(userId, filters.classId, role);
  if (!allowed) throw new HttpError(403, "You are not allowed to view attendance for this class");

  const classRoster = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM students
     WHERE class_id = $1 AND status = 'active'`,
    [filters.classId],
  );
  const total = classRoster.rows[0]?.total ?? 0;

  const { rows } = await query<{
    day: string;
    present: number;
    absent: number;
    late: number;
    register_status: "draft" | "submitted" | "locked" | null;
  }>(
    `SELECT
       d.day::date::text AS day,
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'present'), 0)::int AS present,
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'absent'), 0)::int AS absent,
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'late'), 0)::int AS late,
       ar.status AS register_status
     FROM generate_series($2::date, $3::date, interval '1 day') d(day)
     LEFT JOIN attendance a
       ON a.class_id = $1
      AND a.date = d.day::date
     LEFT JOIN attendance_registers ar
       ON ar.class_id = $1
      AND ar.date = d.day::date
     GROUP BY d.day, ar.status
     ORDER BY d.day DESC`,
    [filters.classId, filters.from, filters.to],
  );

  return rows.map((r) => {
    const marked = r.present + r.absent + r.late;
    const unmarked = Math.max(total - marked, 0);
    const attendanceRate = total > 0 ? Math.round(((r.present + r.late) / total) * 1000) / 10 : 0;
    return {
      date: r.day,
      total,
      present: r.present,
      absent: r.absent,
      late: r.late,
      unmarked,
      attendanceRate,
      registerStatus: r.register_status ?? "draft",
    };
  });
}

export async function recordAttendance(input: AttendanceInput, recordedBy: string, role: Role) {
  return saveAttendanceRegister(
    {
      classId: input.classId,
      date: input.date,
      rows: [{ studentId: input.studentId, status: input.status }],
    },
    recordedBy,
    role,
  );
}

export async function listAttendance(classId: string, date: string, role: Role, userId: string) {
  const register = await getAttendanceRegister(classId, date, role, userId);
  return register.students.map((s) => ({
    student_id: s.studentId,
    class_id: classId,
    date,
    status: s.status,
    student_name: s.studentName,
    student_number: s.studentNumber,
  }));
}

async function loadActiveClassStudentIds(classId: string): Promise<string[]> {
  const { rows } = await query<{ id: string }>(
    `SELECT id
     FROM students
     WHERE class_id = $1 AND status = 'active'`,
    [classId],
  );
  return rows.map((r) => r.id);
}

async function getRegisterMeta(classId: string, date: string): Promise<RegisterMeta> {
  const { rows } = await query<{
    id: string;
    status: "draft" | "submitted" | "locked";
    submitted_at: string | null;
  }>(
    `SELECT id, status, submitted_at
     FROM attendance_registers
     WHERE class_id = $1
       AND date = $2
     LIMIT 1`,
    [classId, date],
  );
  const row = rows[0];
  if (!row) {
    return {
      registerId: null,
      status: "draft",
      submittedAt: null,
    };
  }
  return {
    registerId: row.id,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

async function getClassMeta(classId: string): Promise<{ name: string; stream: string }> {
  const { rows } = await query<{ name: string; stream: string | null }>(
    `SELECT name, stream
     FROM classes
     WHERE id = $1
     LIMIT 1`,
    [classId],
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, "Class not found");
  return {
    name: row.name,
    stream: row.stream ?? "",
  };
}

export type AttendanceAdminOverview = {
  kpis: {
    activeStudents: number;
    classCount: number;
    schoolDays: number;
    avgAttendanceRate: number;
    present: number;
    absent: number;
    late: number;
    registersSubmitted: number;
    registersDraft: number;
    registersMissing: number;
  };
  trend: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
    unmarked: number;
    attendanceRate: number;
  }>;
  byClass: Array<{
    classId: string;
    className: string;
    classStream: string;
    level: string;
    activeStudents: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
    registersSubmitted: number;
    registerDaysExpected: number;
  }>;
  statusBreakdown: { present: number; absent: number; late: number };
  registerCompliance: { submitted: number; draft: number; missing: number };
};

function levelSqlVariants(level?: "O_LEVEL" | "A_LEVEL"): string[] | null {
  if (!level) return null;
  return level === "O_LEVEL" ? ["O_LEVEL", "o_level"] : ["A_LEVEL", "a_level"];
}

/** Builds scoped class filter SQL with typed placeholders (avoids untyped NULL params). */
function buildClassScopeFilters(filters: AttendanceAdminOverviewQuery, alias = "c") {
  const parts: string[] = [];
  const params: unknown[] = [];
  const levelVariants = levelSqlVariants(filters.level);

  if (filters.academicYearId) {
    params.push(filters.academicYearId);
    parts.push(`${alias}.academic_year_id = $${params.length}::uuid`);
  }
  if (filters.classId) {
    params.push(filters.classId);
    parts.push(`${alias}.id = $${params.length}::uuid`);
  }
  if (levelVariants) {
    params.push(levelVariants);
    parts.push(`${alias}.level = ANY($${params.length}::text[])`);
  }

  return {
    whereSql: parts.length ? parts.join(" AND ") : "TRUE",
    params,
  };
}

function withDateRange(scopeParams: unknown[], from: string, to: string) {
  const fromIdx = scopeParams.length + 1;
  const toIdx = scopeParams.length + 2;
  return {
    params: [...scopeParams, from, to],
    betweenSql: `BETWEEN $${fromIdx}::date AND $${toIdx}::date`,
    fromParam: `$${fromIdx}::date`,
    toParam: `$${toIdx}::date`,
  };
}

export async function getAttendanceAdminOverview(
  filters: AttendanceAdminOverviewQuery,
): Promise<AttendanceAdminOverview> {
  const scope = buildClassScopeFilters(filters);
  const dates = withDateRange(scope.params, filters.from, filters.to);

  const rosterQ = await query<{ total: number; class_count: number }>(
    `SELECT
       COALESCE(SUM(cnt), 0)::int AS total,
       COUNT(*)::int AS class_count
     FROM (
       SELECT c.id, COUNT(s.id)::int AS cnt
       FROM classes c
       JOIN students s ON s.class_id = c.id AND s.status = 'active'
       WHERE ${scope.whereSql}
       GROUP BY c.id
     ) x`,
    scope.params,
  );
  const activeStudents = rosterQ.rows[0]?.total ?? 0;
  const classCount = rosterQ.rows[0]?.class_count ?? 0;

  const marksQ = await query<{ present: number; absent: number; late: number }>(
    `SELECT
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'present'), 0)::int AS present,
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'absent'), 0)::int AS absent,
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'late'), 0)::int AS late
     FROM attendance a
     JOIN classes c ON c.id = a.class_id
     WHERE a.date ${dates.betweenSql}
       AND ${scope.whereSql}`,
    dates.params,
  );
  const present = marksQ.rows[0]?.present ?? 0;
  const absent = marksQ.rows[0]?.absent ?? 0;
  const late = marksQ.rows[0]?.late ?? 0;
  const marked = present + absent + late;
  const avgAttendanceRate = marked > 0 ? Math.round(((present + late) / marked) * 1000) / 10 : 0;

  const daysQ = await query<{ school_days: number }>(
    `SELECT (($2::date - $1::date) + 1)::int AS school_days`,
    [filters.from, filters.to],
  );
  const schoolDays = daysQ.rows[0]?.school_days ?? 0;
  const registerDaysExpected = classCount * schoolDays;

  const registersQ = await query<{ submitted: number; draft: number }>(
    `SELECT
       COALESCE(COUNT(*) FILTER (WHERE ar.status IN ('submitted', 'locked')), 0)::int AS submitted,
       COALESCE(COUNT(*) FILTER (WHERE ar.status = 'draft'), 0)::int AS draft
     FROM attendance_registers ar
     JOIN classes c ON c.id = ar.class_id
     WHERE ar.date ${dates.betweenSql}
       AND ${scope.whereSql}`,
    dates.params,
  );
  const registersSubmitted = registersQ.rows[0]?.submitted ?? 0;
  const registersDraft = registersQ.rows[0]?.draft ?? 0;
  const registersMissing = Math.max(registerDaysExpected - registersSubmitted - registersDraft, 0);

  const trendJoinFilter = scope.whereSql === "TRUE" ? "TRUE" : scope.whereSql;
  const trendQ = await query<{
    date: string;
    present: number;
    absent: number;
    late: number;
  }>(
    `SELECT
       d.day::text AS date,
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'present' AND c.id IS NOT NULL), 0)::int AS present,
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'absent' AND c.id IS NOT NULL), 0)::int AS absent,
       COALESCE(COUNT(*) FILTER (WHERE a.status = 'late' AND c.id IS NOT NULL), 0)::int AS late
     FROM generate_series(${dates.fromParam}, ${dates.toParam}, interval '1 day') d(day)
     LEFT JOIN attendance a ON a.date = d.day::date
     LEFT JOIN classes c ON c.id = a.class_id AND ${trendJoinFilter}
     GROUP BY d.day
     ORDER BY d.day ASC`,
    dates.params,
  );

  const trend = trendQ.rows.map((r) => {
    const dayMarked = r.present + r.absent + r.late;
    const unmarked = Math.max(activeStudents - dayMarked, 0);
    const attendanceRate =
      activeStudents > 0 ? Math.round(((r.present + r.late) / activeStudents) * 1000) / 10 : 0;
    return {
      date: r.date,
      present: r.present,
      absent: r.absent,
      late: r.late,
      unmarked,
      attendanceRate,
    };
  });

  const byClassQ = await query<{
    class_id: string;
    class_name: string;
    class_stream: string | null;
    level: string;
    active_students: number;
    present: number;
    absent: number;
    late: number;
    registers_submitted: number;
  }>(
    `SELECT
       c.id AS class_id,
       c.name AS class_name,
       c.stream AS class_stream,
       c.level,
       COALESCE(r.active_students, 0)::int AS active_students,
       COALESCE(m.present, 0)::int AS present,
       COALESCE(m.absent, 0)::int AS absent,
       COALESCE(m.late, 0)::int AS late,
       COALESCE(reg.submitted_days, 0)::int AS registers_submitted
     FROM classes c
     LEFT JOIN (
       SELECT s.class_id, COUNT(*)::int AS active_students
       FROM students s
       WHERE s.status = 'active'
       GROUP BY s.class_id
     ) r ON r.class_id = c.id
     LEFT JOIN (
       SELECT
         a.class_id,
         COUNT(*) FILTER (WHERE a.status = 'present')::int AS present,
         COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent,
         COUNT(*) FILTER (WHERE a.status = 'late')::int AS late
       FROM attendance a
       WHERE a.date ${dates.betweenSql}
       GROUP BY a.class_id
     ) m ON m.class_id = c.id
     LEFT JOIN (
       SELECT
         ar.class_id,
         COUNT(*)::int AS submitted_days
       FROM attendance_registers ar
       WHERE ar.date ${dates.betweenSql}
         AND ar.status IN ('submitted', 'locked')
       GROUP BY ar.class_id
     ) reg ON reg.class_id = c.id
     WHERE ${scope.whereSql}
     ORDER BY c.name, c.stream`,
    dates.params,
  );

  const byClass = byClassQ.rows.map((r) => {
    const classMarked = r.present + r.absent + r.late;
    const attendanceRate =
      classMarked > 0 ? Math.round(((r.present + r.late) / classMarked) * 1000) / 10 : 0;
    return {
      classId: r.class_id,
      className: r.class_name,
      classStream: r.class_stream ?? "",
      level: r.level === "o_level" || r.level === "O_LEVEL" ? "O_LEVEL" : "A_LEVEL",
      activeStudents: r.active_students,
      present: r.present,
      absent: r.absent,
      late: r.late,
      attendanceRate,
      registersSubmitted: r.registers_submitted,
      registerDaysExpected: schoolDays,
    };
  });

  return {
    kpis: {
      activeStudents,
      classCount,
      schoolDays,
      avgAttendanceRate,
      present,
      absent,
      late,
      registersSubmitted,
      registersDraft,
      registersMissing,
    },
    trend,
    byClass,
    statusBreakdown: { present, absent, late },
    registerCompliance: {
      submitted: registersSubmitted,
      draft: registersDraft,
      missing: registersMissing,
    },
  };
}
