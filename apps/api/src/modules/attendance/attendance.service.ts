import type { AttendanceInput } from "@uganda-cbc-sms/shared";
import type { Role } from "@uganda-cbc-sms/shared";
import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { teacherCanAccessClassForAttendance } from "../../utils/teacherTeachingAccess";

export async function recordAttendance(input: AttendanceInput, recordedBy: string, role: Role) {
  const allowed = await teacherCanAccessClassForAttendance(recordedBy, input.classId, role);
  if (!allowed) throw new HttpError(403, "You are not allowed to record attendance for this class");
  try {
    await query(
      `INSERT INTO attendance (student_id, class_id, date, status, recorded_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (student_id, date) DO UPDATE SET
       status = EXCLUDED.status,
       class_id = EXCLUDED.class_id,
       recorded_by = EXCLUDED.recorded_by`,
      [input.studentId, input.classId, input.date, input.status, recordedBy],
    );
    return { ok: true };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not record attendance");
  }
}

export async function listAttendance(classId: string, date: string, role: Role, userId: string) {
  try {
    const allowed = await teacherCanAccessClassForAttendance(userId, classId, role);
    if (!allowed) throw new HttpError(403, "You are not allowed to view attendance for this class");
    const { rows } = await query(
      `SELECT a.*, s.full_name AS student_name, s.student_number
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       WHERE a.class_id = $1 AND a.date = $2
       ORDER BY s.student_number`,
      [classId, date],
    );
    return rows;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not list attendance");
  }
}
