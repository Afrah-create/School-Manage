import type { ExamPaperInput } from "@uganda-cbc-sms/shared";
import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";

export function normalizeExamPapers(input: {
  papers?: ExamPaperInput[];
  subjectIds?: string[];
}): ExamPaperInput[] {
  if (input.papers?.length) {
    return input.papers.map((p) => ({
      subjectId: p.subjectId,
      isCompulsory: p.isCompulsory !== false,
    }));
  }
  if (input.subjectIds?.length) {
    return input.subjectIds.map((subjectId) => ({ subjectId, isCompulsory: true }));
  }
  return [];
}

export async function replaceExamPapers(examId: string, papers: ExamPaperInput[]) {
  const subjectIds = papers.map((p) => p.subjectId);
  if (subjectIds.length) {
    await query(`DELETE FROM exam_marks WHERE exam_id = $1 AND subject_id <> ALL($2::uuid[])`, [
      examId,
      subjectIds,
    ]);
    await query(
      `DELETE FROM exam_subject_submissions WHERE exam_id = $1 AND subject_id <> ALL($2::uuid[])`,
      [examId, subjectIds],
    );
  } else {
    await query(`DELETE FROM exam_marks WHERE exam_id = $1`, [examId]);
    await query(`DELETE FROM exam_subject_submissions WHERE exam_id = $1`, [examId]);
  }
  await query(`DELETE FROM exam_subjects WHERE exam_id = $1`, [examId]);
  for (const paper of papers) {
    await query(
      `INSERT INTO exam_subjects (exam_id, subject_id, is_compulsory) VALUES ($1, $2, $3)`,
      [examId, paper.subjectId, paper.isCompulsory],
    );
  }
}

/** Register every active class student for each compulsory paper on the exam. */
export async function seedCompulsoryEntries(examId: string, classId: string) {
  await query(
    `INSERT INTO exam_student_entries (exam_id, student_id, subject_id)
     SELECT $1, st.id, es.subject_id
     FROM students st
     CROSS JOIN exam_subjects es
     WHERE st.class_id = $2
       AND st.status = 'active'
       AND es.exam_id = $1
       AND es.is_compulsory = true
     ON CONFLICT (exam_id, student_id, subject_id) DO NOTHING`,
    [examId, classId],
  );
}

export async function countEntrantsForSubject(examId: string, subjectId: string): Promise<number> {
  const { rows } = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM exam_student_entries
     WHERE exam_id = $1 AND subject_id = $2`,
    [examId, subjectId],
  );
  return rows[0]?.c ?? 0;
}

export async function assertStudentsEnteredForMarks(
  examId: string,
  subjectId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) return;
  const { rows } = await query<{ student_id: string }>(
    `SELECT student_id FROM exam_student_entries
     WHERE exam_id = $1 AND subject_id = $2 AND student_id = ANY($3::uuid[])`,
    [examId, subjectId, studentIds],
  );
  if (rows.length !== studentIds.length) {
    throw new HttpError(
      400,
      "One or more students are not registered for this exam paper. Update student entries before saving marks.",
    );
  }
}
