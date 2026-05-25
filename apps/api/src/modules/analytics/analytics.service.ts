import { query } from "../../config/db";

export async function dashboardKpis() {
  try {
    const [st, inv, cbc, al] = await Promise.all([
      query(`SELECT COUNT(*)::text AS c FROM students WHERE status = 'active'`),
      query(
        `SELECT COALESCE(SUM(amount_paid),0)::text AS paid, COALESCE(SUM(total_amount),0)::text AS due FROM fee_invoices`,
      ),
      query(
        `SELECT COALESCE(AVG(
            CASE rating WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2 WHEN 'D' THEN 1 END
          ),0)::text AS avg_cbc
         FROM cbc_scores WHERE rating IS NOT NULL`,
      ),
      query(
        `SELECT COALESCE(AVG(score::numeric),0)::text AS avg_alevel FROM alevel_scores`,
      ),
    ]);
    return {
      activeStudents: st.rows[0]?.c ?? "0",
      totalFeesDue: (inv.rows[0] as { due?: string })?.due ?? "0",
      totalFeesPaid: (inv.rows[0] as { paid?: string })?.paid ?? "0",
      averageCbcNumeric: cbc.rows[0]?.avg_cbc ?? "0",
      averageAlevelScore: al.rows[0]?.avg_alevel ?? "0",
    };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not load dashboard");
  }
}

export async function classPerformance(classId: string, termId: string) {
  try {
    const cbc = await query(
      `SELECT sub.name, cs.rating, COUNT(*)::int AS cnt
       FROM cbc_scores cs
       JOIN students s ON s.id = cs.student_id
       JOIN subjects sub ON sub.id = cs.subject_id
       WHERE s.class_id = $1 AND cs.term_id = $2
       GROUP BY sub.name, cs.rating
       ORDER BY sub.name, cs.rating`,
      [classId, termId],
    );
    const al = await query(
      `SELECT sub.name, COALESCE(AVG(als.score::numeric),0)::text AS avg_score
       FROM alevel_scores als
       JOIN students s ON s.id = als.student_id
       JOIN subjects sub ON sub.id = als.subject_id
       WHERE s.class_id = $1 AND als.term_id = $2
       GROUP BY sub.name
       ORDER BY sub.name`,
      [classId, termId],
    );
    return { cbc: cbc.rows, alevel: al.rows };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not load class performance");
  }
}

type ReportTrackStats = {
  generated: number;
  approved: number;
  pendingApproval: number;
  notGenerated: number;
};

export async function reportPipeline(classId: string, termId: string) {
  try {
    const active = await query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM students WHERE class_id = $1 AND status = 'active'`,
      [classId],
    );
    const activeStudents = active.rows[0]?.c ?? 0;

    const cbc = await query<{ generated: number; approved: number }>(
      `SELECT
         COUNT(*)::int AS generated,
         COUNT(*) FILTER (WHERE cr.is_approved)::int AS approved
       FROM cbc_report_cards cr
       JOIN students s ON s.id = cr.student_id
       WHERE s.class_id = $1 AND cr.term_id = $2`,
      [classId, termId],
    );
    const al = await query<{ generated: number; approved: number }>(
      `SELECT
         COUNT(*)::int AS generated,
         COUNT(*) FILTER (WHERE ar.is_approved)::int AS approved
       FROM alevel_results ar
       JOIN students s ON s.id = ar.student_id
       WHERE s.class_id = $1 AND ar.term_id = $2`,
      [classId, termId],
    );

    const cbcRow = cbc.rows[0] ?? { generated: 0, approved: 0 };
    const alRow = al.rows[0] ?? { generated: 0, approved: 0 };

    const toTrack = (row: { generated: number; approved: number }): ReportTrackStats => {
      const generated = row.generated;
      const approved = row.approved;
      const pendingApproval = Math.max(0, generated - approved);
      const notGenerated = Math.max(0, activeStudents - generated);
      return { generated, approved, pendingApproval, notGenerated };
    };

    const timeline = await query<{ day: string; track: string; cnt: number }>(
      `SELECT DATE(approved_at)::text AS day, 'cbc' AS track, COUNT(*)::int AS cnt
       FROM cbc_report_cards cr
       JOIN students s ON s.id = cr.student_id
       WHERE s.class_id = $1 AND cr.term_id = $2 AND cr.is_approved AND cr.approved_at IS NOT NULL
       GROUP BY DATE(approved_at)
       UNION ALL
       SELECT DATE(approved_at)::text AS day, 'alevel' AS track, COUNT(*)::int AS cnt
       FROM alevel_results ar
       JOIN students s ON s.id = ar.student_id
       WHERE s.class_id = $1 AND ar.term_id = $2 AND ar.is_approved AND ar.approved_at IS NOT NULL
       GROUP BY DATE(approved_at)
       ORDER BY day`,
      [classId, termId],
    );

    return {
      activeStudents,
      cbc: toTrack(cbcRow),
      alevel: toTrack(alRow),
      approvalTimeline: timeline.rows,
    };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not load report pipeline");
  }
}

export async function alevelDivisions(classId: string, termId: string) {
  try {
    const { rows } = await query<{ division: string; cnt: number }>(
      `SELECT COALESCE(ar.division, 'Unassigned') AS division, COUNT(*)::int AS cnt
       FROM alevel_results ar
       JOIN students s ON s.id = ar.student_id
       WHERE s.class_id = $1 AND ar.term_id = $2
       GROUP BY ar.division
       ORDER BY cnt DESC`,
      [classId, termId],
    );
    return rows;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not load A-Level divisions");
  }
}

export async function assessmentReadiness(classId: string, termId: string, yearId: string) {
  try {
    const [cbc, alevel] = await Promise.all([
      query<{ subject_id: string; subject_name: string; subject_code: string; teacher_name: string | null; status: string }>(
        `SELECT
          s.id AS subject_id,
          s.name AS subject_name,
          s.code AS subject_code,
          u.full_name AS teacher_name,
          CASE
            WHEN COUNT(ac.id) = 0 THEN 'Draft'
            WHEN BOOL_AND(ac.is_submitted) THEN 'Submitted'
            ELSE 'Draft'
          END AS status
         FROM class_subjects cs
         JOIN subjects s ON s.id = cs.subject_id
         LEFT JOIN users u ON u.id = cs.teacher_id
         LEFT JOIN students st ON st.class_id = cs.class_id
         LEFT JOIN assessments_cbc ac
           ON ac.student_id = st.id
          AND ac.subject_id = cs.subject_id
          AND ac.term_id = $2
          AND ac.academic_year_id = $3
         WHERE cs.class_id = $1 AND cs.academic_year_id = $3
         GROUP BY s.id, s.name, s.code, u.full_name
         ORDER BY s.code`,
        [classId, termId, yearId],
      ),
      query<{ subject_id: string; subject_name: string; subject_code: string; teacher_name: string | null; status: string }>(
        `SELECT
          s.id AS subject_id,
          s.name AS subject_name,
          s.code AS subject_code,
          u.full_name AS teacher_name,
          CASE
            WHEN COUNT(aa.id) = 0 THEN 'Draft'
            WHEN BOOL_AND(aa.is_submitted) THEN 'Submitted'
            ELSE 'Draft'
          END AS status
         FROM class_subjects cs
         JOIN subjects s ON s.id = cs.subject_id
         LEFT JOIN users u ON u.id = cs.teacher_id
         LEFT JOIN students st ON st.class_id = cs.class_id
         LEFT JOIN assessments_alevel aa
           ON aa.student_id = st.id
          AND aa.subject_id = cs.subject_id
          AND aa.term_id = $2
          AND aa.academic_year_id = $3
         WHERE cs.class_id = $1 AND cs.academic_year_id = $3
         GROUP BY s.id, s.name, s.code, u.full_name
         ORDER BY s.code`,
        [classId, termId, yearId],
      ),
    ]);
    return { cbc: cbc.rows, alevel: alevel.rows };
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Could not load assessment readiness");
  }
}

export async function reportsOverview(classId: string, termId: string, yearId: string) {
  const [pipeline, performance, readiness, divisions, kpis] = await Promise.all([
    reportPipeline(classId, termId),
    classPerformance(classId, termId),
    assessmentReadiness(classId, termId, yearId),
    alevelDivisions(classId, termId),
    dashboardKpis(),
  ]);
  return { pipeline, performance, readiness, divisions, kpis };
}
