import type { Readable } from "stream";
import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { streamAlevelReportCard, streamCbcReportCard } from "../../utils/pdf";

const schoolName = process.env.SCHOOL_NAME ?? "Uganda Secondary School";

export async function generateCbcReports(classId: string, termId: string) {
  try {
    const { rows: students } = await query<{ id: string }>(
      `SELECT id FROM students WHERE class_id = $1 AND status = 'active'`,
      [classId],
    );
    const created: string[] = [];
    for (const s of students) {
      const ex = await query(
        `SELECT id FROM cbc_report_cards WHERE student_id = $1 AND term_id = $2`,
        [s.id, termId],
      );
      if (ex.rows.length === 0) {
        const ins = await query<{ id: string }>(
          `INSERT INTO cbc_report_cards (student_id, term_id) VALUES ($1, $2) RETURNING id`,
          [s.id, termId],
        );
        created.push(ins.rows[0]!.id);
      } else {
        created.push((ex.rows[0] as { id: string }).id);
      }
    }
    return { reportIds: created, count: created.length };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not generate CBC reports");
  }
}

export async function generateAlevelReports(classId: string, termId: string) {
  try {
    const { rows: students } = await query<{ id: string }>(
      `SELECT id FROM students WHERE class_id = $1 AND status = 'active'`,
      [classId],
    );
    const created: string[] = [];
    for (const s of students) {
      const ex = await query(
        `SELECT id FROM alevel_results WHERE student_id = $1 AND term_id = $2`,
        [s.id, termId],
      );
      if (ex.rows.length === 0) {
        const ins = await query<{ id: string }>(
          `INSERT INTO alevel_results (student_id, term_id) VALUES ($1, $2) RETURNING id`,
          [s.id, termId],
        );
        created.push(ins.rows[0]!.id);
      } else {
        created.push((ex.rows[0] as { id: string }).id);
      }
    }
    return { reportIds: created, count: created.length };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not generate A-Level reports");
  }
}

export async function approveReport(reportId: string, approvedBy: string) {
  try {
    const cbc = await query(`SELECT id FROM cbc_report_cards WHERE id = $1`, [reportId]);
    if (cbc.rows.length > 0) {
      await query(
        `UPDATE cbc_report_cards SET is_approved = true, approved_by = $1, approved_at = NOW() WHERE id = $2`,
        [approvedBy, reportId],
      );
      return { type: "cbc" as const };
    }
    const al = await query(`SELECT id FROM alevel_results WHERE id = $1`, [reportId]);
    if (al.rows.length > 0) {
      await query(
        `UPDATE alevel_results SET is_approved = true, approved_by = $1, approved_at = NOW() WHERE id = $2`,
        [approvedBy, reportId],
      );
      return { type: "alevel" as const };
    }
    throw new HttpError(404, "Report not found");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new Error(e instanceof Error ? e.message : "Could not approve report");
  }
}

export async function getReportPdfStream(reportId: string): Promise<Readable> {
  const cbc = await query(
    `SELECT cr.*, s.full_name, s.student_number, s.photo_url,
            c.name AS class_name, c.stream,
            t.term_number, ay.name AS year_name
     FROM cbc_report_cards cr
     JOIN students s ON s.id = cr.student_id
     LEFT JOIN classes c ON c.id = s.class_id
     JOIN terms t ON t.id = cr.term_id
     JOIN academic_years ay ON ay.id = t.academic_year_id
     WHERE cr.id = $1`,
    [reportId],
  );
  if (cbc.rows.length > 0) {
    const row = cbc.rows[0] as Record<string, unknown>;
    const studentId = row.student_id as string;
    const termId = row.term_id as string;
    const scores = await query(
      `SELECT
         sub.name AS subject_name,
         COALESCE(st.name, st.strand_name) AS strand_name,
         cs.competency,
         cs.rating
       FROM cbc_scores cs
       JOIN subjects sub ON sub.id = cs.subject_id
       JOIN cbc_strands st ON st.id = cs.strand_id
       WHERE cs.student_id = $1 AND cs.term_id = $2`,
      [studentId, termId],
    );
    const termRow = await query<{ start_date: string; end_date: string }>(
      `SELECT start_date, end_date FROM terms WHERE id = $1`,
      [termId],
    );
    const start = termRow.rows[0]?.start_date;
    const end = termRow.rows[0]?.end_date;
    const att = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM attendance
       WHERE student_id = $1 AND date >= $2 AND date <= $3 AND status = 'present'`,
      [studentId, start, end],
    );
    const daysAttended = Number(att.rows[0]?.c ?? 0);
    const totalDays = await schoolDaysInRange(String(start), String(end));

    const subjects = (scores.rows as Record<string, unknown>[]).map((r) => ({
      name: String(r.subject_name),
      strand: String(r.strand_name),
      competency: String(r.competency),
      rating: String(r.rating),
    }));

    return streamCbcReportCard({
      schoolName,
      studentName: String(row.full_name),
      studentNumber: String(row.student_number),
      className: String(row.class_name ?? ""),
      stream: String(row.stream ?? ""),
      term: `Term ${row.term_number}`,
      year: String(row.year_name),
      photoPath: row.photo_url ? String(row.photo_url) : null,
      subjects,
      daysAttended,
      totalDays,
      teacherComment: String(row.teacher_comment ?? ""),
      headteacherComment: String(row.headteacher_comment ?? ""),
    });
  }

  const al = await query(
    `SELECT ar.*, s.full_name, s.student_number,
            c.name AS class_name, sc.code AS combination_code, sc.name AS combination_name,
            t.term_number, ay.name AS year_name
     FROM alevel_results ar
     JOIN students s ON s.id = ar.student_id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN subject_combinations sc ON sc.id = s.combination_id
     JOIN terms t ON t.id = ar.term_id
     JOIN academic_years ay ON ay.id = t.academic_year_id
     WHERE ar.id = $1`,
    [reportId],
  );
  if (al.rows.length > 0) {
    const row = al.rows[0] as Record<string, unknown>;
    const studentId = row.student_id as string;
    const termId = row.term_id as string;
    const subs = await query(
      `SELECT sub.name, als.score::text AS score, als.grade, als.points
       FROM alevel_scores als
       JOIN subjects sub ON sub.id = als.subject_id
       WHERE als.student_id = $1 AND als.term_id = $2`,
      [studentId, termId],
    );
    const subjects = (subs.rows as Record<string, unknown>[]).map((r) => ({
      name: String(r.name),
      score: String(r.score),
      grade: String(r.grade ?? ""),
      points: Number(r.points ?? 0),
    }));

    return streamAlevelReportCard({
      schoolName,
      studentName: String(row.full_name),
      studentNumber: String(row.student_number),
      className: String(row.class_name ?? ""),
      combination: String(row.combination_code ?? row.combination_name ?? ""),
      term: `Term ${row.term_number}`,
      year: String(row.year_name),
      subjects,
      totalPoints: row.total_points != null ? Number(row.total_points) : null,
      division: row.division != null ? String(row.division) : null,
      teacherComment: String(row.teacher_comment ?? ""),
      headteacherRemark: String(row.headteacher_remark ?? ""),
    });
  }

  throw new HttpError(404, "Report not found");
}

async function schoolDaysInRange(start: string, end: string): Promise<number> {
  const s = new Date(start);
  const e = new Date(end);
  let n = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) n++;
  }
  return Math.max(n, 1);
}
