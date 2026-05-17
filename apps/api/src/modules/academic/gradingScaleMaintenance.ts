import type { GradingScaleLevel } from "@uganda-cbc-sms/shared";
import { query } from "../../config/db";
import { computeDivision } from "../../utils/grading";
import { defaultScaleRows, resolveConfiguredGrade } from "../../utils/gradingScales";

type SeedOptions = {
  levels?: GradingScaleLevel[];
  reset?: boolean;
};

type RecalculateOptions = {
  termId?: string;
  yearId?: string;
  studentId?: string;
};

export async function seedDefaultGradingScales(options: SeedOptions = {}) {
  const levels = options.levels ?? ["A_LEVEL", "O_LEVEL"];
  let inserted = 0;

  for (const level of levels) {
    if (options.reset) {
      await query(`DELETE FROM assessment_grading_scales WHERE level = $1`, [level]);
    }

    const rows = defaultScaleRows(level);
    for (const row of rows) {
      const result = await query(
        `INSERT INTO assessment_grading_scales
          (level, grade, min_score, max_score, points, descriptor, sort_order, is_active, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW())
         ON CONFLICT (level, grade) DO UPDATE SET
           min_score = EXCLUDED.min_score,
           max_score = EXCLUDED.max_score,
           points = EXCLUDED.points,
           descriptor = EXCLUDED.descriptor,
           sort_order = EXCLUDED.sort_order,
           is_active = true,
           updated_at = NOW()`,
        [level, row.grade, row.minScore, row.maxScore, row.points, row.descriptor, row.sortOrder],
      );
      inserted += result.rowCount ?? 0;
    }
  }

  return { levels, inserted };
}

export async function recalculateAlevelGrades(options: RecalculateOptions = {}) {
  const where: string[] = ["aa.score IS NOT NULL"];
  const values: unknown[] = [];
  let i = 1;

  if (options.termId) {
    where.push(`aa.term_id = $${i++}`);
    values.push(options.termId);
  }
  if (options.yearId) {
    where.push(`aa.academic_year_id = $${i++}`);
    values.push(options.yearId);
  }
  if (options.studentId) {
    where.push(`aa.student_id = $${i++}`);
    values.push(options.studentId);
  }

  const { rows } = await query<{
    id: string;
    student_id: string;
    term_id: string;
    academic_year_id: string;
    score: string;
  }>(
    `SELECT aa.id, aa.student_id, aa.term_id, aa.academic_year_id, aa.score::text AS score
     FROM assessments_alevel aa
     WHERE ${where.join(" AND ")}`,
    values,
  );

  let updatedScores = 0;
  const divisionKeys = new Set<string>();

  for (const row of rows) {
    const score = Number(row.score);
    if (Number.isNaN(score)) continue;
    const { grade, points } = await resolveConfiguredGrade(score, "A_LEVEL");
    await query(
      `UPDATE assessments_alevel
       SET grade = $2, points = $3, updated_at = NOW()
       WHERE id = $1`,
      [row.id, grade, points],
    );
    updatedScores += 1;
    divisionKeys.add(`${row.student_id}:${row.term_id}:${row.academic_year_id}`);
  }

  let updatedDivisions = 0;
  for (const key of divisionKeys) {
    const [studentId, termId, yearId] = key.split(":");
    if (!studentId || !termId || !yearId) continue;
    await recalcStudentDivision(studentId, termId, yearId);
    updatedDivisions += 1;
  }

  return { updatedScores, updatedDivisions, scanned: rows.length };
}

async function recalcStudentDivision(studentId: string, termId: string, yearId: string) {
  const scoreRows = await query<{ points: number }>(
    `SELECT points
     FROM assessments_alevel
     WHERE student_id = $1 AND term_id = $2 AND academic_year_id = $3 AND points IS NOT NULL`,
    [studentId, termId, yearId],
  );
  const totalPoints = scoreRows.rows.reduce((sum, row) => sum + row.points, 0);
  const division = computeDivision(totalPoints);
  const student = await query<{ combination_id: string | null }>(`SELECT combination_id FROM students WHERE id = $1`, [
    studentId,
  ]);
  await query(
    `INSERT INTO student_division_summary (
      student_id, term_id, academic_year_id, combination_id, total_points, division, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
    ON CONFLICT (student_id, term_id, academic_year_id) DO UPDATE SET
      combination_id = EXCLUDED.combination_id,
      total_points = EXCLUDED.total_points,
      division = EXCLUDED.division,
      updated_at = NOW()`,
    [studentId, termId, yearId, student.rows[0]?.combination_id ?? null, totalPoints, division],
  );
}
