import { query } from "../config/db";

/** Teacher is linked to a class for the year (homeroom or additional class teacher). */
export async function teacherAssignedToClass(
  teacherId: string,
  classId: string,
  academicYearId?: string,
): Promise<boolean> {
  const values: unknown[] = [teacherId, classId];
  let yearClause = "";
  if (academicYearId) {
    yearClause = " AND cta.academic_year_id = $3";
    values.push(academicYearId);
  }
  const { rows } = await query(
    `SELECT 1
     FROM class_teacher_assignments cta
     WHERE cta.teacher_id = $1 AND cta.class_id = $2${yearClause}
     UNION
     SELECT 1
     FROM classes c
     WHERE c.id = $2 AND c.class_teacher_id = $1
     LIMIT 1`,
    values,
  );
  return rows.length > 0;
}

export async function syncHomeroomOnClass(classId: string, academicYearId: string) {
  const { rows } = await query<{ teacher_id: string }>(
    `SELECT teacher_id FROM class_teacher_assignments
     WHERE class_id = $1 AND academic_year_id = $2 AND is_homeroom = true
     LIMIT 1`,
    [classId, academicYearId],
  );
  const homeroomId = rows[0]?.teacher_id ?? null;
  await query(`UPDATE classes SET class_teacher_id = $1 WHERE id = $2`, [homeroomId, classId]);
}
