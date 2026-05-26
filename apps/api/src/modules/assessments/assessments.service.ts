import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { resolveConfiguredGrade } from "../../utils/gradingScales";

type CbcUpsertItem = {
  studentId: string;
  subjectId: string;
  strand: string;
  competency: string;
  rating: "A" | "B" | "C" | "D";
};

type CbcProjectIn = {
  studentId: string;
  subjectId: string;
  assessmentTitle: string;
  score: number | null;
  maxScore: number | null;
  termId: string;
  yearId: string;
};

type AlevelUpsertItem = {
  studentId: string;
  subjectId: string;
  score: number;
};

export async function teacherAssignedToStudentSubject(
  teacherId: string,
  studentId: string,
  subjectId: string,
  yearId: string,
) {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok
     FROM students st
     JOIN class_subjects cs
       ON cs.class_id = st.class_id
      AND cs.subject_id = $3
      AND cs.academic_year_id = $4
      AND cs.teacher_id = $1
     WHERE st.id = $2
     LIMIT 1`,
    [teacherId, studentId, subjectId, yearId],
  );
  return Boolean(rows[0]);
}

export async function teacherAssignedToClassSubject(
  teacherId: string,
  classId: string,
  subjectId: string,
  yearId: string,
) {
  const { rows } = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM class_subjects
     WHERE class_id = $2 AND subject_id = $3 AND academic_year_id = $4 AND teacher_id = $1
     LIMIT 1`,
    [teacherId, classId, subjectId, yearId],
  );
  return Boolean(rows[0]);
}

export async function listCbc(filters: {
  classId?: string;
  subjectId?: string;
  strandId?: string;
  termId?: string;
  yearId?: string;
  teacherId?: string;
}) {
  const where: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (filters.classId) {
    where.push(`st.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters.subjectId) {
    where.push(`ac.subject_id = $${i++}`);
    values.push(filters.subjectId);
  }
  if (filters.strandId) {
    where.push(`ac.strand = (SELECT COALESCE(name, strand_name) FROM cbc_strands WHERE id = $${i++})`);
    values.push(filters.strandId);
  }
  if (filters.termId) {
    where.push(`ac.term_id = $${i++}`);
    values.push(filters.termId);
  }
  if (filters.yearId) {
    where.push(`ac.academic_year_id = $${i++}`);
    values.push(filters.yearId);
  }
  if (filters.teacherId) {
    where.push(`cs.teacher_id = $${i++}`);
    values.push(filters.teacherId);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const joinCs = filters.teacherId
    ? `JOIN class_subjects cs
         ON cs.class_id = st.class_id
        AND cs.subject_id = ac.subject_id
        AND cs.academic_year_id = ac.academic_year_id`
    : "";
  const { rows } = await query(
    `SELECT
      ac.*,
      st.full_name AS student_name,
      st.student_number
     FROM assessments_cbc ac
     JOIN students st ON st.id = ac.student_id
     ${joinCs}
     ${clause}
     ORDER BY st.full_name, ac.strand, ac.competency`,
    values,
  );
  return rows;
}

export async function upsertCbc(item: CbcUpsertItem, termId: string, yearId: string, teacherId: string) {
  const { rows } = await query<{ is_locked: boolean }>(
    `SELECT is_locked FROM assessments_cbc
     WHERE student_id = $1 AND subject_id = $2 AND strand = $3 AND competency = $4 AND term_id = $5 AND academic_year_id = $6`,
    [item.studentId, item.subjectId, item.strand, item.competency, termId, yearId],
  );
  if (rows[0]?.is_locked) {
    throw new HttpError(400, "Assessment is locked. Headteacher must unlock.");
  }
  await query(
    `INSERT INTO assessments_cbc (
      student_id, subject_id, strand, competency, rating, term_id, academic_year_id, teacher_id, is_locked, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,NOW())
    ON CONFLICT (student_id, subject_id, strand, competency, term_id, academic_year_id) DO UPDATE SET
      rating = EXCLUDED.rating,
      teacher_id = EXCLUDED.teacher_id,
      updated_at = NOW()
    `,
    [item.studentId, item.subjectId, item.strand, item.competency, item.rating, termId, yearId, teacherId],
  );
}

export async function upsertCbcBulk(items: CbcUpsertItem[], termId: string, yearId: string, teacherId: string) {
  for (const item of items) {
    await upsertCbc(item, termId, yearId, teacherId);
  }
  return { saved: items.length };
}

export async function submitCbc(subjectId: string, classId: string, termId: string, yearId: string, actorId: string) {
  await query(
    `UPDATE assessments_cbc ac
     SET is_submitted = true, submitted_at = NOW(), is_locked = true, updated_at = NOW()
     FROM students st
     WHERE st.id = ac.student_id
       AND st.class_id = $1
       AND ac.subject_id = $2
       AND ac.term_id = $3
       AND ac.academic_year_id = $4`,
    [classId, subjectId, termId, yearId],
  );
  await logAssessmentAudit(actorId, "assessment_cbc_submitted", {
    subjectId,
    classId,
    termId,
    yearId,
  });
}

export async function unlockCbc(subjectId: string, classId: string, termId: string, yearId: string, actorId: string) {
  await query(
    `UPDATE assessments_cbc ac
     SET is_locked = false, is_submitted = false, updated_at = NOW()
     FROM students st
     WHERE st.id = ac.student_id
       AND st.class_id = $1
       AND ac.subject_id = $2
       AND ac.term_id = $3
       AND ac.academic_year_id = $4`,
    [classId, subjectId, termId, yearId],
  );
  await logAssessmentAudit(actorId, "assessment_cbc_unlocked", {
    subjectId,
    classId,
    termId,
    yearId,
  });
}

export async function listCbcProject(filters: { classId?: string; subjectId?: string; termId?: string; yearId?: string }) {
  const where: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (filters.classId) {
    where.push(`st.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters.subjectId) {
    where.push(`p.subject_id = $${i++}`);
    values.push(filters.subjectId);
  }
  if (filters.termId) {
    where.push(`p.term_id = $${i++}`);
    values.push(filters.termId);
  }
  if (filters.yearId) {
    where.push(`p.academic_year_id = $${i++}`);
    values.push(filters.yearId);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT p.*, st.full_name AS student_name, st.student_number
     FROM assessments_cbc_project p
     JOIN students st ON st.id = p.student_id
     ${clause}
     ORDER BY st.full_name, p.assessment_title`,
    values,
  );
  return rows;
}

export async function createCbcProject(input: CbcProjectIn, teacherId: string) {
  const { rows } = await query(
    `INSERT INTO assessments_cbc_project (
      student_id, subject_id, assessment_title, score, max_score, term_id, academic_year_id, teacher_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      input.studentId,
      input.subjectId,
      input.assessmentTitle,
      input.score,
      input.maxScore ?? 100,
      input.termId,
      input.yearId,
      teacherId,
    ],
  );
  return rows[0];
}

export async function updateCbcProject(id: string, input: Partial<CbcProjectIn>, teacherId: string) {
  const { rows } = await query(
    `UPDATE assessments_cbc_project
     SET
       assessment_title = COALESCE($2, assessment_title),
       score = COALESCE($3, score),
       max_score = COALESCE($4, max_score)
     WHERE id = $1 AND teacher_id = $5
     RETURNING *`,
    [id, input.assessmentTitle ?? null, input.score ?? null, input.maxScore ?? null, teacherId],
  );
  if (!rows[0]) throw new HttpError(404, "Project assessment not found");
  return rows[0];
}

export async function listCbcComments(classId: string, termId: string, yearId: string) {
  const { rows } = await query(
    `SELECT c.*, st.full_name AS student_name, st.student_number
     FROM assessment_comments c
     JOIN students st ON st.id = c.student_id
     WHERE st.class_id = $1 AND c.term_id = $2 AND c.academic_year_id = $3
     ORDER BY st.full_name`,
    [classId, termId, yearId],
  );
  return rows;
}

export async function upsertCbcComment(
  studentId: string,
  termId: string,
  yearId: string,
  role: string,
  userId: string,
  payload: { classTeacherComment?: string; headteacherComment?: string },
) {
  const classTeacherComment = role === "class_teacher" ? (payload.classTeacherComment ?? null) : null;
  const headteacherComment = role === "headteacher" ? (payload.headteacherComment ?? null) : null;
  const { rows } = await query(
    `INSERT INTO assessment_comments (
      student_id, term_id, academic_year_id, class_teacher_comment, headteacher_comment, class_teacher_id, headteacher_id, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT (student_id, term_id, academic_year_id) DO UPDATE SET
      class_teacher_comment = COALESCE(EXCLUDED.class_teacher_comment, assessment_comments.class_teacher_comment),
      headteacher_comment = COALESCE(EXCLUDED.headteacher_comment, assessment_comments.headteacher_comment),
      class_teacher_id = COALESCE(EXCLUDED.class_teacher_id, assessment_comments.class_teacher_id),
      headteacher_id = COALESCE(EXCLUDED.headteacher_id, assessment_comments.headteacher_id),
      updated_at = NOW()
    RETURNING *`,
    [
      studentId,
      termId,
      yearId,
      classTeacherComment,
      headteacherComment,
      role === "class_teacher" ? userId : null,
      role === "headteacher" ? userId : null,
    ],
  );
  return rows[0];
}

export async function cbcStatus(classId: string, termId: string, yearId: string) {
  const { rows } = await query(
    `SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      s.code AS subject_code,
      u.id AS teacher_id,
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
     GROUP BY s.id, s.name, s.code, u.id, u.full_name
     ORDER BY s.code`,
    [classId, termId, yearId],
  );
  return rows;
}

export async function listAlevel(filters: {
  classId?: string;
  subjectId?: string;
  combinationId?: string;
  termId?: string;
  yearId?: string;
  teacherId?: string;
}) {
  const where: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (filters.classId) {
    where.push(`st.class_id = $${i++}`);
    values.push(filters.classId);
  }
  if (filters.subjectId) {
    where.push(`aa.subject_id = $${i++}`);
    values.push(filters.subjectId);
  }
  if (filters.combinationId) {
    where.push(`st.combination_id = $${i++}`);
    values.push(filters.combinationId);
  }
  if (filters.termId) {
    where.push(`aa.term_id = $${i++}`);
    values.push(filters.termId);
  }
  if (filters.yearId) {
    where.push(`aa.academic_year_id = $${i++}`);
    values.push(filters.yearId);
  }
  if (filters.teacherId) {
    where.push(`cs.teacher_id = $${i++}`);
    values.push(filters.teacherId);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const joinCs = filters.teacherId
    ? `JOIN class_subjects cs
         ON cs.class_id = st.class_id
        AND cs.subject_id = aa.subject_id
        AND cs.academic_year_id = aa.academic_year_id`
    : "";
  const { rows } = await query(
    `SELECT
      aa.*,
      st.full_name AS student_name,
      st.student_number,
      sds.total_points,
      sds.division
     FROM assessments_alevel aa
     JOIN students st ON st.id = aa.student_id
     ${joinCs}
     LEFT JOIN student_division_summary sds
       ON sds.student_id = aa.student_id
      AND sds.term_id = aa.term_id
      AND sds.academic_year_id = aa.academic_year_id
     ${clause}
     ORDER BY st.full_name`,
    values,
  );
  return rows;
}

export async function upsertAlevel(item: AlevelUpsertItem, termId: string, yearId: string, teacherId: string) {
  const { grade, points } = await resolveConfiguredGrade(item.score, "A_LEVEL");
  await query(
    `INSERT INTO assessments_alevel (
      student_id, subject_id, score, grade, points, term_id, academic_year_id, teacher_id, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
    ON CONFLICT (student_id, subject_id, term_id, academic_year_id) DO UPDATE SET
      score = EXCLUDED.score,
      grade = EXCLUDED.grade,
      points = EXCLUDED.points,
      teacher_id = EXCLUDED.teacher_id,
      updated_at = NOW()`,
    [item.studentId, item.subjectId, item.score, grade, points, termId, yearId, teacherId],
  );
  await recalcStudentDivision(item.studentId, termId, yearId);
  return { grade, points };
}

export async function upsertAlevelBulk(items: AlevelUpsertItem[], termId: string, yearId: string, teacherId: string) {
  const affected = new Set<string>();
  for (const item of items) {
    await upsertAlevel(item, termId, yearId, teacherId);
    affected.add(item.studentId);
  }
  return { saved: items.length, studentsRecalculated: affected.size };
}

export async function submitAlevel(subjectId: string, classId: string, termId: string, yearId: string, actorId: string) {
  await query(
    `UPDATE assessments_alevel aa
     SET is_submitted = true, submitted_at = NOW(), updated_at = NOW()
     FROM students st
     WHERE st.id = aa.student_id
       AND st.class_id = $1
       AND aa.subject_id = $2
       AND aa.term_id = $3
       AND aa.academic_year_id = $4`,
    [classId, subjectId, termId, yearId],
  );
  await logAssessmentAudit(actorId, "assessment_alevel_submitted", {
    subjectId,
    classId,
    termId,
    yearId,
  });
}

export async function alevelDivision(classId: string, combinationId: string | undefined, termId: string, yearId: string) {
  const values: unknown[] = [classId, termId, yearId];
  let clause = "";
  if (combinationId) {
    clause = " AND st.combination_id = $4";
    values.push(combinationId);
  }
  const { rows } = await query(
    `SELECT
      st.id AS student_id,
      st.full_name AS student_name,
      st.student_number,
      sc.id AS combination_id,
      sc.code AS combination_code,
      sc.name AS combination_name,
      sds.total_points,
      sds.division
     FROM students st
     LEFT JOIN subject_combinations sc ON sc.id = st.combination_id
     LEFT JOIN student_division_summary sds
       ON sds.student_id = st.id
      AND sds.term_id = $2
      AND sds.academic_year_id = $3
     WHERE st.class_id = $1${clause}
     ORDER BY st.full_name`,
    values,
  );
  return rows;
}

export async function listAlevelComments(classId: string, termId: string, yearId: string) {
  const { rows } = await query(
    `SELECT c.*, st.full_name AS student_name, st.student_number
     FROM assessment_alevel_comments c
     JOIN students st ON st.id = c.student_id
     WHERE st.class_id = $1 AND c.term_id = $2 AND c.academic_year_id = $3
     ORDER BY st.full_name`,
    [classId, termId, yearId],
  );
  return rows;
}

export async function upsertAlevelComment(
  studentId: string,
  termId: string,
  yearId: string,
  role: string,
  userId: string,
  payload: { classTeacherComment?: string; headteacherRemark?: string },
) {
  const classTeacherComment = role === "class_teacher" ? (payload.classTeacherComment ?? null) : null;
  const headteacherRemark = role === "headteacher" ? (payload.headteacherRemark ?? null) : null;
  const { rows } = await query(
    `INSERT INTO assessment_alevel_comments (
      student_id, term_id, academic_year_id, class_teacher_comment, headteacher_remark, class_teacher_id, headteacher_id, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT (student_id, term_id, academic_year_id) DO UPDATE SET
      class_teacher_comment = COALESCE(EXCLUDED.class_teacher_comment, assessment_alevel_comments.class_teacher_comment),
      headteacher_remark = COALESCE(EXCLUDED.headteacher_remark, assessment_alevel_comments.headteacher_remark),
      class_teacher_id = COALESCE(EXCLUDED.class_teacher_id, assessment_alevel_comments.class_teacher_id),
      headteacher_id = COALESCE(EXCLUDED.headteacher_id, assessment_alevel_comments.headteacher_id),
      updated_at = NOW()
    RETURNING *`,
    [
      studentId,
      termId,
      yearId,
      classTeacherComment,
      headteacherRemark,
      role === "class_teacher" ? userId : null,
      role === "headteacher" ? userId : null,
    ],
  );
  return rows[0];
}

export async function alevelStatus(classId: string, termId: string, yearId: string) {
  const { rows } = await query(
    `SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      s.code AS subject_code,
      u.id AS teacher_id,
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
     GROUP BY s.id, s.name, s.code, u.id, u.full_name
     ORDER BY s.code`,
    [classId, termId, yearId],
  );
  return rows;
}

export async function subjectsAssigned(
  teacherId: string,
  opts?: { classId?: string; termId?: string; yearId?: string; track?: "cbc" | "alevel" },
) {
  const where: string[] = ["cs.teacher_id = $1"];
  const values: unknown[] = [teacherId];
  let i = 2;
  if (opts?.classId) {
    where.push(`cs.class_id = $${i++}`);
    values.push(opts.classId);
  }
  if (opts?.termId) {
    where.push(`(cs.term_id = $${i++} OR cs.term_id IS NULL)`);
    values.push(opts.termId);
  }
  if (opts?.yearId) {
    where.push(`cs.academic_year_id = $${i++}`);
    values.push(opts.yearId);
  }
  if (opts?.track === "alevel") {
    where.push(`c.level = 'A_LEVEL'`);
  } else if (opts?.track === "cbc") {
    where.push(`c.level = 'O_LEVEL'`);
    where.push(
      `EXISTS (SELECT 1 FROM cbc_strands st WHERE st.subject_id = cs.subject_id)`,
    );
  }
  const { rows } = await query(
    `SELECT DISTINCT
      cs.subject_id AS "subjectId",
      s.name AS "subjectName",
      s.code AS "subjectCode",
      cs.class_id AS "classId",
      c.name AS "className",
      c.stream AS "classStream",
      c.level AS "classLevel"
     FROM class_subjects cs
     JOIN subjects s ON s.id = cs.subject_id
     JOIN classes c ON c.id = cs.class_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.name, c.stream NULLS LAST, s.code`,
    values,
  );
  return rows;
}

export async function strands(subjectId?: string) {
  const values: unknown[] = [];
  let where = "";
  if (subjectId) {
    where = "WHERE st.subject_id = $1";
    values.push(subjectId);
  }
  const { rows } = await query(
    `SELECT
      st.id,
      st.subject_id AS "subjectId",
      COALESCE(st.name, st.strand_name) AS name,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('id', ss.id, 'name', ss.name, 'code', ss.code)
          ORDER BY ss.name
        ) FILTER (WHERE ss.id IS NOT NULL),
        '[]'::jsonb
      ) AS "subStrands",
      COALESCE(st.competencies, '[]'::jsonb) AS competencies
     FROM cbc_strands st
     LEFT JOIN cbc_sub_strands ss ON ss.strand_id = st.id
     ${where}
     GROUP BY st.id
     ORDER BY name`,
    values,
  );
  return rows;
}

export async function combinations() {
  const { rows } = await query(
    `SELECT
      sc.id,
      sc.code,
      sc.name,
      sc.level,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('id', s.id, 'code', s.code, 'name', s.name)
          ORDER BY s.code
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::jsonb
      ) AS subjects
     FROM subject_combinations sc
     LEFT JOIN combination_subjects cs ON cs.combination_id = sc.id
     LEFT JOIN subjects s ON s.id = cs.subject_id
     GROUP BY sc.id
     ORDER BY sc.code`,
  );
  return rows;
}

async function recalcStudentDivision(studentId: string, termId: string, yearId: string) {
  const { computeAlevelAggregate } = await import("../../utils/alevelDivision");
  const scoreRows = await query<{ points: number }>(
    `SELECT points
     FROM assessments_alevel
     WHERE student_id = $1 AND term_id = $2 AND academic_year_id = $3 AND points IS NOT NULL`,
    [studentId, termId, yearId],
  );
  const { totalPoints, division } = computeAlevelAggregate(scoreRows.rows.map((r) => r.points));
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

async function logAssessmentAudit(actorId: string, action: string, metadata: Record<string, unknown>) {
  await query(
    `INSERT INTO user_audit_logs (user_id, actor_id, action, metadata)
     VALUES ($1, $1, $2, $3::jsonb)`,
    [actorId, action, JSON.stringify(metadata)],
  );
}
