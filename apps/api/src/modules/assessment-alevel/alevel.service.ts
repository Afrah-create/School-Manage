import * as sharedSchemas from "@uganda-cbc-sms/shared";
import type { z } from "zod";
import { query } from "../../config/db";
import { getDivision, getUnebGrade } from "../../utils/grading";

const { alevelScoreUpsertSchema } = sharedSchemas;

type ScoreIn = z.infer<typeof alevelScoreUpsertSchema>;

export async function upsertAlevelScore(input: ScoreIn, teacherId: string) {
  try {
    const { grade, points } = getUnebGrade(Number(input.score));
    await query(
      `INSERT INTO alevel_scores (student_id, subject_id, term_id, score, grade, points, teacher_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (student_id, subject_id, term_id) DO UPDATE SET
         score = EXCLUDED.score,
         grade = EXCLUDED.grade,
         points = EXCLUDED.points,
         teacher_id = EXCLUDED.teacher_id,
         updated_at = NOW()`,
      [
        input.studentId,
        input.subjectId,
        input.termId,
        input.score,
        grade,
        points,
        teacherId,
      ],
    );
    await recomputeDivision(input.studentId, input.termId);
    return { grade, points };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not save A-Level score");
  }
}

/** Best 3 subjects = three lowest point values (UNEB: lower points = better). */
export async function recomputeDivision(studentId: string, termId: string) {
  try {
    const { rows } = await query<{ points: number }>(
      `SELECT points FROM alevel_scores WHERE student_id = $1 AND term_id = $2 AND points IS NOT NULL`,
      [studentId, termId],
    );
    const pts = rows.map((r) => r.points).sort((a, b) => a - b);
    const best3 = pts.slice(0, 3);
    const total = best3.reduce((s, p) => s + p, 0);
    const division = getDivision(total);

    const ex = await query(`SELECT id FROM alevel_results WHERE student_id = $1 AND term_id = $2`, [
      studentId,
      termId,
    ]);
    if (ex.rows.length === 0) {
      await query(
        `INSERT INTO alevel_results (student_id, term_id, total_points, division)
         VALUES ($1, $2, $3, $4)`,
        [studentId, termId, total, division],
      );
    } else {
      await query(
        `UPDATE alevel_results SET total_points = $1, division = $2 WHERE student_id = $3 AND term_id = $4`,
        [total, division, studentId, termId],
      );
    }
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not recompute division");
  }
}

export async function listAlevelScores(filters: {
  classId?: string;
  subjectId?: string;
  termId?: string;
}) {
  try {
    const cond: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (filters.subjectId) {
      cond.push(`als.subject_id = $${i++}`);
      params.push(filters.subjectId);
    }
    if (filters.termId) {
      cond.push(`als.term_id = $${i++}`);
      params.push(filters.termId);
    }
    if (filters.classId) {
      cond.push(`st.class_id = $${i++}`);
      params.push(filters.classId);
    }
    const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT als.*, st.full_name AS student_name, st.student_number
       FROM alevel_scores als
       JOIN students st ON st.id = als.student_id
       ${where}
       ORDER BY st.student_number`,
      params,
    );
    return rows;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not list A-Level scores");
  }
}
