import { query } from "../config/db";
import { teacherAssignedToClass } from "./classTeacherAssignments";

/** Roles that may be assigned to teach a class–subject slot (subject marks + attendance). */
export const TEACHING_ASSIGNMENT_ROLES = new Set([
  "subject_teacher",
  "class_teacher",
  "headteacher",
  "admin",
]);

/**
 * A teacher may enter marks / take a class–subject slot when:
 * - they are explicitly assigned on class_subjects, or
 * - they are the homeroom (class) teacher for that class and the subject is on the class timetable.
 */
export async function teacherCanTeachClassSubject(
  teacherId: string,
  classId: string,
  subjectId: string,
  academicYearId: string,
): Promise<boolean> {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.class_id = $2
       AND cs.subject_id = $3
       AND cs.academic_year_id = $4
       AND (
         cs.teacher_id = $1
         OR c.class_teacher_id = $1
         OR EXISTS (
           SELECT 1 FROM class_teacher_assignments cta
           WHERE cta.class_id = $2
             AND cta.teacher_id = $1
             AND cta.academic_year_id = $4
         )
       )
     LIMIT 1`,
    [teacherId, classId, subjectId, academicYearId],
  );
  return Boolean(rows[0]);
}

export async function teacherCanAccessClassForAttendance(
  teacherId: string,
  classId: string,
  role: string,
): Promise<boolean> {
  if (role === "admin" || role === "headteacher") return true;
  if (role === "class_teacher" || role === "subject_teacher") {
    if (await teacherAssignedToClass(teacherId, classId)) return true;
  }
  if (role === "subject_teacher") {
    const { rows } = await query(
      `SELECT 1 FROM class_subjects WHERE class_id = $1 AND teacher_id = $2 LIMIT 1`,
      [classId, teacherId],
    );
    return rows.length > 0;
  }
  return false;
}

/** SQL: teacher param is eligible for class_subjects row cs (join classes c, subjects s). */
export function teacherEligibilitySql(teacherParam: string): string {
  return `(
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = ${teacherParam}
        AND u.deleted_at IS NULL
        AND u.is_active = true
        AND (
          u.role IN ('admin', 'headteacher')
          OR (
            u.role = 'subject_teacher'
            AND (
              NOT EXISTS (SELECT 1 FROM teacher_subject_specializations tss WHERE tss.teacher_id = u.id)
              OR EXISTS (
                SELECT 1 FROM teacher_subject_specializations tss
                WHERE tss.teacher_id = u.id AND tss.subject_id = cs.subject_id
              )
            )
          )
          OR (
            u.role = 'class_teacher'
            AND (
              c.class_teacher_id = u.id
              OR EXISTS (
                SELECT 1 FROM class_teacher_assignments cta
                WHERE cta.class_id = c.id
                  AND cta.teacher_id = u.id
                  AND cta.academic_year_id = cs.academic_year_id
              )
              OR (
                NOT EXISTS (SELECT 1 FROM teacher_subject_specializations tss WHERE tss.teacher_id = u.id)
                OR EXISTS (
                  SELECT 1 FROM teacher_subject_specializations tss
                  WHERE tss.teacher_id = u.id AND tss.subject_id = cs.subject_id
                )
              )
            )
          )
        )
    )
    AND s.level = c.level
  )`;
}
