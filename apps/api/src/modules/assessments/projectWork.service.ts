import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { assertTeacherIsAssignedSubjectTeacher } from "../../utils/teacherTeachingAccess";

export type ProjectWorkRow = {
  id: string;
  studentId: string;
  classSubjectId: string;
  termId: string;
  projectNumber: number;
  score: number;
  maxScore: number;
  scoredBy: string;
  scoredAt: string;
  evidenceRef: string | null;
  notes: string | null;
  studentName?: string;
  studentNumber?: string;
};

async function resolveClassSubjectId(
  classId: string,
  subjectId: string,
  yearId: string,
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM class_subjects
     WHERE class_id = $1 AND subject_id = $2 AND academic_year_id = $3
     LIMIT 1`,
    [classId, subjectId, yearId],
  );
  if (!rows[0]) {
    throw new HttpError(400, "Class subject assignment not found for this class and subject");
  }
  return rows[0].id;
}

export async function listProjectWork(filters: {
  classId?: string;
  subjectId?: string;
  termId?: string;
  yearId?: string;
}): Promise<ProjectWorkRow[]> {
  const where: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (filters.classId) {
    where.push(`st.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters.subjectId) {
    where.push(`cs.subject_id = $${i++}`);
    values.push(filters.subjectId);
  }
  if (filters.termId) {
    where.push(`pws.term_id = $${i++}`);
    values.push(filters.termId);
  }
  if (filters.yearId) {
    where.push(`cs.academic_year_id = $${i++}`);
    values.push(filters.yearId);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT
       pws.id,
       pws.student_id,
       pws.class_subject_id,
       pws.term_id,
       pws.project_number,
       pws.score::text,
       pws.max_score::text,
       pws.scored_by,
       pws.scored_at,
       pws.evidence_ref,
       pws.notes,
       st.full_name AS student_name,
       st.student_number
     FROM project_work_scores pws
     JOIN students st ON st.id = pws.student_id
     JOIN class_subjects cs ON cs.id = pws.class_subject_id
     ${clause}
     ORDER BY st.full_name, pws.project_number`,
    values,
  );
  return rows.map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x["id"]),
      studentId: String(x["student_id"]),
      classSubjectId: String(x["class_subject_id"]),
      termId: String(x["term_id"]),
      projectNumber: Number(x["project_number"]),
      score: Number(x["score"]),
      maxScore: Number(x["max_score"]),
      scoredBy: String(x["scored_by"]),
      scoredAt: new Date(String(x["scored_at"])).toISOString(),
      evidenceRef: x["evidence_ref"] != null ? String(x["evidence_ref"]) : null,
      notes: x["notes"] != null ? String(x["notes"]) : null,
      studentName: x["student_name"] != null ? String(x["student_name"]) : undefined,
      studentNumber: x["student_number"] != null ? String(x["student_number"]) : undefined,
    };
  });
}

export async function upsertProjectWorkBulk(
  input: {
    classId: string;
    subjectId: string;
    termId: string;
    yearId: string;
    scores: Array<{
      studentId: string;
      projectNumber: number;
      score: number | null;
      maxScore?: number;
    }>;
  },
  teacherId: string,
): Promise<ProjectWorkRow[]> {
  await assertTeacherIsAssignedSubjectTeacher(
    teacherId,
    input.classId,
    input.subjectId,
    input.yearId,
  );
  const classSubjectId = await resolveClassSubjectId(input.classId, input.subjectId, input.yearId);

  for (const item of input.scores) {
    if (item.score == null) {
      await query(
        `DELETE FROM project_work_scores
         WHERE student_id = $1 AND class_subject_id = $2 AND term_id = $3 AND project_number = $4`,
        [item.studentId, classSubjectId, input.termId, item.projectNumber],
      );
      continue;
    }
    await query(
      `INSERT INTO project_work_scores (
         student_id, class_subject_id, term_id, project_number,
         score, max_score, scored_by, scored_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
       ON CONFLICT (tenant_id, student_id, class_subject_id, term_id, project_number)
       DO UPDATE SET
         score = EXCLUDED.score,
         max_score = EXCLUDED.max_score,
         scored_by = EXCLUDED.scored_by,
         scored_at = NOW(),
         updated_at = NOW()`,
      [
        item.studentId,
        classSubjectId,
        input.termId,
        item.projectNumber,
        item.score,
        item.maxScore ?? 100,
        teacherId,
      ],
    );
  }

  return listProjectWork({
    classId: input.classId,
    subjectId: input.subjectId,
    termId: input.termId,
    yearId: input.yearId,
  });
}
