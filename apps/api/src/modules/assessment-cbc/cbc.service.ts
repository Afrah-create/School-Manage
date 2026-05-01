import * as sharedSchemas from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";

const { cbcScoresBulkSchema } = sharedSchemas;

type BulkIn = z.infer<typeof cbcScoresBulkSchema>;

export async function upsertCbcScores(input: BulkIn, teacherId: string) {
  try {
    for (const item of input.items) {
      const { rows: existing } = await query<{ id: string; submitted: boolean }>(
        `SELECT id, submitted FROM cbc_scores
         WHERE student_id = $1 AND subject_id = $2 AND strand_id = $3 AND competency = $4 AND term_id = $5`,
        [item.studentId, item.subjectId, item.strandId, item.competency, item.termId],
      );
      if (existing[0]?.submitted) {
        throw new HttpError(400, "Score is submitted — headteacher must unlock to edit");
      }
      await query(
        `INSERT INTO cbc_scores (
          student_id, subject_id, strand_id, term_id, competency, rating, teacher_id, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (student_id, subject_id, strand_id, competency, term_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          teacher_id = EXCLUDED.teacher_id,
          updated_at = NOW()`,
        [
          item.studentId,
          item.subjectId,
          item.strandId,
          item.termId,
          item.competency,
          item.rating,
          teacherId,
        ],
      );
    }
    return { saved: input.items.length };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not save CBC scores");
  }
}

export async function listCbcScores(filters: {
  classId?: string;
  subjectId?: string;
  termId?: string;
}) {
  try {
    const cond: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (filters.subjectId) {
      cond.push(`cs.subject_id = $${i++}`);
      params.push(filters.subjectId);
    }
    if (filters.termId) {
      cond.push(`cs.term_id = $${i++}`);
      params.push(filters.termId);
    }
    if (filters.classId) {
      cond.push(`st.class_id = $${i++}`);
      params.push(filters.classId);
    }
    const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT cs.*, st.full_name AS student_name, st.student_number
       FROM cbc_scores cs
       JOIN students st ON st.id = cs.student_id
       ${where}
       ORDER BY st.student_number, cs.competency`,
      params,
    );
    return rows;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list CBC scores");
  }
}

export async function submitScore(id: string) {
  try {
    const r = await query(
      `UPDATE cbc_scores SET submitted = true, submitted_at = NOW(), updated_at = NOW() WHERE id = $1 AND submitted = false`,
      [id],
    );
    if (r.rowCount === 0) {
      const { rows } = await query(`SELECT submitted FROM cbc_scores WHERE id = $1`, [id]);
      if (rows.length === 0) throw new HttpError(404, "Score not found");
      throw new HttpError(400, "Already submitted");
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not submit");
  }
}

export async function unlockScore(id: string) {
  try {
    const r = await query(
      `UPDATE cbc_scores SET submitted = false, submitted_at = NULL, updated_at = NOW() WHERE id = $1`,
      [id],
    );
    if (r.rowCount === 0) throw new HttpError(404, "Score not found");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not unlock");
  }
}
