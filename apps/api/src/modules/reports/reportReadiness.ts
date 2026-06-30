import { normalizeClassLevel, classTrackFromLevel } from "../../utils/classLevel";
import { query } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import { loadAssessmentConfig } from "../../utils/assessmentConfig";
import { activeTenantIdFromContext } from "../../utils/activeTenant";

export type SubjectReadinessRow = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  status: string;
};

export type SubjectSubmissionStatus = "not_started" | "in_progress" | "submitted";

export type SubjectSubmissionTrack = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  activeStudents: number;
  studentsWithMarks: number;
  studentsSubmitted: number;
  status: SubjectSubmissionStatus;
  lastSubmittedAt: string | null;
};

export type ProjectWorkTrackStatus = "not_required" | "not_started" | "in_progress" | "submitted";

export type ProjectWorkSubmissionTrack = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  projectWorkRequired: boolean;
  projectsExpected: number;
  activeStudents: number;
  studentsWithProjects: number;
  studentsMeetingExpected: number;
  status: ProjectWorkTrackStatus;
};

function deriveProjectWorkStatus(
  required: boolean,
  activeStudents: number,
  studentsMeeting: number,
  allowIncomplete: boolean,
): ProjectWorkTrackStatus {
  if (!required) return "not_required";
  if (activeStudents === 0 || studentsMeeting >= activeStudents || allowIncomplete) return "submitted";
  if (studentsMeeting > 0) return "in_progress";
  return "not_started";
}

function deriveSubmissionStatus(
  activeStudents: number,
  studentsWithMarks: number,
  studentsSubmitted: number,
): SubjectSubmissionStatus {
  if (studentsWithMarks === 0) return "not_started";
  if (activeStudents > 0 && studentsSubmitted >= activeStudents) return "submitted";
  return "in_progress";
}

export async function getClassContext(classId: string, termId: string) {
  const { rows: classRows } = await query<{ level: string; name: string; academic_year_id: string }>(
    `SELECT level, name, academic_year_id FROM classes WHERE id = $1`,
    [classId],
  );
  if (classRows.length === 0) {
    throw new HttpError(404, "We could not find that class. Refresh the page and try again.");
  }

  const { rows: termRows } = await query<{ academic_year_id: string; term_number: number }>(
    `SELECT academic_year_id, term_number FROM terms WHERE id = $1`,
    [termId],
  );
  if (termRows.length === 0) {
    throw new HttpError(400, "The selected term is not valid. Choose another term and try again.");
  }

  const cls = classRows[0]!;
  const term = termRows[0]!;
  if (term.academic_year_id !== cls.academic_year_id) {
    throw new HttpError(
      400,
      "This class does not belong to the same academic year as the selected term. Adjust your filters.",
    );
  }

  const classLevel = normalizeClassLevel(cls.level);
  const track = classTrackFromLevel(classLevel);
  return {
    classId,
    termId,
    academicYearId: cls.academic_year_id,
    classLevel,
    className: cls.name,
    termNumber: term.term_number,
    track,
  };
}

export async function listSubjectReadiness(
  classId: string,
  termId: string,
  academicYearId: string,
  track: "cbc" | "alevel",
): Promise<SubjectReadinessRow[]> {
  if (track === "cbc") {
    const { rows } = await query<SubjectReadinessRow>(
      `SELECT
          s.id AS subject_id,
          s.name AS subject_name,
          s.code AS subject_code,
          CASE
            WHEN (
              SELECT COUNT(*)::int
              FROM exams e
              JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id
              WHERE e.class_id = $1 AND e.term_id = $2 AND es.is_compulsory = true
            ) = 0 THEN 'Draft'
            WHEN (
              SELECT COUNT(*)::int
              FROM exams e
              JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id
              JOIN exam_subject_submissions ess
                ON ess.exam_id = e.id AND ess.subject_id = cs.subject_id AND ess.is_submitted = true
              WHERE e.class_id = $1 AND e.term_id = $2
            ) = (
              SELECT COUNT(*)::int
              FROM exams e
              JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id
              WHERE e.class_id = $1 AND e.term_id = $2 AND es.is_compulsory = true
            ) THEN 'Submitted'
            ELSE 'Draft'
          END AS status
         FROM class_subjects cs
         JOIN classes c ON c.id = cs.class_id
         JOIN subjects s ON s.id = cs.subject_id AND s.level = c.level
         WHERE cs.class_id = $1 AND cs.academic_year_id = $3 AND cs.include_on_reports = true
         GROUP BY s.id, s.name, s.code, cs.subject_id
         ORDER BY s.code`,
      [classId, termId, academicYearId],
    );
    return rows.map((r) => {
      const row = r as unknown as {
        subject_id: string;
        subject_name: string;
        subject_code: string;
        status: string;
      };
      return {
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
        status: row.status,
      };
    });
  }

  const { rows } = await query<{
    subject_id: string;
    subject_name: string;
    subject_code: string;
    status: string;
  }>(
    `SELECT
        s.id AS subject_id,
        s.name AS subject_name,
        s.code AS subject_code,
        CASE
          WHEN COUNT(aa.id) = 0 THEN 'Draft'
          WHEN BOOL_AND(aa.is_submitted) THEN 'Submitted'
          ELSE 'Draft'
        END AS status
       FROM class_subjects cs
       JOIN classes c ON c.id = cs.class_id
       JOIN subjects s ON s.id = cs.subject_id AND s.level = c.level
       LEFT JOIN students st ON st.class_id = cs.class_id AND st.status = 'active'
       LEFT JOIN assessments_alevel aa
         ON aa.student_id = st.id
        AND aa.subject_id = cs.subject_id
        AND aa.term_id = $2
        AND aa.academic_year_id = $3
       WHERE cs.class_id = $1 AND cs.academic_year_id = $3 AND cs.include_on_reports = true
       GROUP BY s.id, s.name, s.code
       ORDER BY s.code`,
    [classId, termId, academicYearId],
  );
  return rows.map((r) => ({
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    subjectCode: r.subject_code,
    status: r.status,
  }));
}

export async function listSubjectSubmissionTracking(
  classId: string,
  termId: string,
  academicYearId: string,
  track: "cbc" | "alevel",
  activeStudents: number,
): Promise<SubjectSubmissionTrack[]> {
  if (track === "cbc") {
    const { rows } = await query<{
      subject_id: string;
      subject_name: string;
      subject_code: string;
      teacher_id: string | null;
      teacher_name: string | null;
      teacher_email: string | null;
      students_with_marks: number;
      students_submitted: number;
      last_submitted_at: Date | null;
    }>(
      `SELECT
          s.id AS subject_id,
          s.name AS subject_name,
          s.code AS subject_code,
          u.id AS teacher_id,
          u.full_name AS teacher_name,
          u.email AS teacher_email,
          (
            SELECT COUNT(DISTINCT em.student_id)::int
            FROM exams e
            JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id AND es.is_compulsory = true
            JOIN exam_marks em ON em.exam_id = e.id AND em.subject_id = cs.subject_id
            JOIN students st ON st.id = em.student_id AND st.class_id = $1 AND st.status = 'active'
            WHERE e.class_id = $1 AND e.term_id = $2
          ) AS students_with_marks,
          CASE
            WHEN (
              SELECT COUNT(*)::int
              FROM exams e
              JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id
              WHERE e.class_id = $1 AND e.term_id = $2 AND es.is_compulsory = true
            ) > 0
            AND (
              SELECT COUNT(*)::int
              FROM exams e
              JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id
              JOIN exam_subject_submissions ess
                ON ess.exam_id = e.id AND ess.subject_id = cs.subject_id AND ess.is_submitted = true
              WHERE e.class_id = $1 AND e.term_id = $2 AND es.is_compulsory = true
            ) = (
              SELECT COUNT(*)::int
              FROM exams e
              JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id
              WHERE e.class_id = $1 AND e.term_id = $2 AND es.is_compulsory = true
            ) THEN $4::int
            ELSE (
              SELECT COUNT(DISTINCT em.student_id)::int
              FROM exams e
              JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id AND es.is_compulsory = true
              JOIN exam_marks em ON em.exam_id = e.id AND em.subject_id = cs.subject_id
              JOIN students st ON st.id = em.student_id AND st.class_id = $1 AND st.status = 'active'
              WHERE e.class_id = $1 AND e.term_id = $2
            )
          END AS students_submitted,
          (
            SELECT MAX(ess.submitted_at)
            FROM exams e
            JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = cs.subject_id AND es.is_compulsory = true
            JOIN exam_subject_submissions ess ON ess.exam_id = e.id AND ess.subject_id = cs.subject_id
            WHERE e.class_id = $1 AND e.term_id = $2
          ) AS last_submitted_at
         FROM class_subjects cs
         JOIN classes c ON c.id = cs.class_id
         JOIN subjects s ON s.id = cs.subject_id AND s.level = c.level
         LEFT JOIN users u ON u.id = cs.teacher_id
         WHERE cs.class_id = $1 AND cs.academic_year_id = $3 AND cs.include_on_reports = true
         ORDER BY s.code`,
      [classId, termId, academicYearId, activeStudents],
    );

    return rows.map((r) => {
      const studentsWithMarks = Number(r.students_with_marks);
      const studentsSubmitted = Number(r.students_submitted);
      const status = deriveSubmissionStatus(activeStudents, studentsWithMarks, studentsSubmitted);
      return {
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        subjectCode: r.subject_code,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        teacherEmail: r.teacher_email,
        activeStudents,
        studentsWithMarks,
        studentsSubmitted,
        status,
        lastSubmittedAt: r.last_submitted_at
          ? new Date(r.last_submitted_at).toISOString()
          : null,
      };
    });
  }

  const { rows } = await query<{
    subject_id: string;
    subject_name: string;
    subject_code: string;
    teacher_id: string | null;
    teacher_name: string | null;
    teacher_email: string | null;
    students_with_marks: number;
    students_submitted: number;
    last_submitted_at: Date | null;
  }>(
    `SELECT
        s.id AS subject_id,
        s.name AS subject_name,
        s.code AS subject_code,
        u.id AS teacher_id,
        u.full_name AS teacher_name,
        u.email AS teacher_email,
        COUNT(DISTINCT aa.student_id)::int AS students_with_marks,
        COUNT(DISTINCT aa.student_id) FILTER (WHERE aa.is_submitted)::int AS students_submitted,
        MAX(aa.submitted_at) AS last_submitted_at
       FROM class_subjects cs
       JOIN classes c ON c.id = cs.class_id
       JOIN subjects s ON s.id = cs.subject_id AND s.level = c.level
       LEFT JOIN users u ON u.id = cs.teacher_id
       LEFT JOIN students st ON st.class_id = cs.class_id AND st.status = 'active'
       LEFT JOIN assessments_alevel aa
         ON aa.student_id = st.id
        AND aa.subject_id = cs.subject_id
        AND aa.term_id = $2
        AND aa.academic_year_id = $3
       WHERE cs.class_id = $1 AND cs.academic_year_id = $3 AND cs.include_on_reports = true
       GROUP BY s.id, s.name, s.code, u.id, u.full_name, u.email
       ORDER BY s.code`,
    [classId, termId, academicYearId],
  );

  return rows.map((r) => {
    const studentsWithMarks = Number(r.students_with_marks);
    const studentsSubmitted = Number(r.students_submitted);
    const status = deriveSubmissionStatus(activeStudents, studentsWithMarks, studentsSubmitted);
    return {
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      teacherId: r.teacher_id,
      teacherName: r.teacher_name,
      teacherEmail: r.teacher_email,
      activeStudents,
      studentsWithMarks,
      studentsSubmitted,
      status,
      lastSubmittedAt: r.last_submitted_at
        ? new Date(r.last_submitted_at).toISOString()
        : null,
    };
  });
}

export async function listCompulsoryExamPaperSubjectIds(examId: string): Promise<string[]> {
  const { rows } = await query<{ subject_id: string }>(
    `SELECT subject_id FROM exam_subjects WHERE exam_id = $1 AND is_compulsory = true`,
    [examId],
  );
  return rows.map((r) => r.subject_id);
}

/** @deprecated Use listCompulsoryExamPaperSubjectIds — only compulsory papers affect term tracking. */
export async function listExamPaperSubjectIds(examId: string): Promise<string[]> {
  return listCompulsoryExamPaperSubjectIds(examId);
}

/** Subjects on the linked formal exam use exam marks instead of separate term entry. */
export function termTrackingExcludingExamPapers(
  subjectTracking: SubjectSubmissionTrack[],
  examPaperSubjectIds: string[],
): SubjectSubmissionTrack[] {
  if (examPaperSubjectIds.length === 0) return subjectTracking;
  const onExam = new Set(examPaperSubjectIds);
  return subjectTracking.filter((s) => !onExam.has(s.subjectId));
}

export async function listProjectWorkSubmissionTracking(
  classId: string,
  termId: string,
  academicYearId: string,
  activeStudents: number,
  projectsExpected: number,
  allowIncompleteOverride: boolean,
): Promise<ProjectWorkSubmissionTrack[]> {
  const { rows } = await query<{
    subject_id: string;
    subject_name: string;
    subject_code: string;
    teacher_id: string | null;
    teacher_name: string | null;
    teacher_email: string | null;
    project_work_required: boolean;
    students_with_projects: number;
    students_meeting_expected: number;
  }>(
    `WITH project_counts AS (
       SELECT cs.subject_id, pws.student_id, COUNT(*)::int AS project_count
       FROM project_work_scores pws
       JOIN class_subjects cs ON cs.id = pws.class_subject_id
       WHERE cs.class_id = $1 AND pws.term_id = $2
       GROUP BY cs.subject_id, pws.student_id
     )
     SELECT
       s.id AS subject_id,
       s.name AS subject_name,
       s.code AS subject_code,
       u.id AS teacher_id,
       u.full_name AS teacher_name,
       u.email AS teacher_email,
       cs.project_work_required,
       COALESCE((
         SELECT COUNT(DISTINCT pc.student_id)::int
         FROM project_counts pc
         WHERE pc.subject_id = cs.subject_id
       ), 0) AS students_with_projects,
       COALESCE((
         SELECT COUNT(DISTINCT pc.student_id)::int
         FROM project_counts pc
         WHERE pc.subject_id = cs.subject_id AND pc.project_count >= $4
       ), 0) AS students_meeting_expected
     FROM class_subjects cs
     JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN users u ON u.id = cs.teacher_id
     WHERE cs.class_id = $1
       AND cs.academic_year_id = $3
       AND cs.include_on_reports = true
     ORDER BY s.code`,
    [classId, termId, academicYearId, projectsExpected],
  );

  return rows.map((r) => {
    const studentsMeetingExpected = Number(r.students_meeting_expected);
    const status = deriveProjectWorkStatus(
      Boolean(r.project_work_required),
      activeStudents,
      studentsMeetingExpected,
      allowIncompleteOverride,
    );
    return {
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      teacherId: r.teacher_id,
      teacherName: r.teacher_name,
      teacherEmail: r.teacher_email,
      projectWorkRequired: Boolean(r.project_work_required),
      projectsExpected,
      activeStudents,
      studentsWithProjects: Number(r.students_with_projects),
      studentsMeetingExpected,
      status,
    };
  });
}

export async function assertReportReadiness(
  classId: string,
  termId: string,
  options?: { allowPartial?: boolean; linkedExamId?: string },
) {
  const ctx = await getClassContext(classId, termId);

  const { rows: studentCount } = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM students WHERE class_id = $1 AND status = 'active'`,
    [classId],
  );
  const activeStudents = studentCount[0]?.c ?? 0;
  if (activeStudents === 0) {
    throw new HttpError(400, "This class has no active students to include on report cards.");
  }

  const subjectTracking = await listSubjectSubmissionTracking(
    classId,
    termId,
    ctx.academicYearId,
    ctx.track,
    activeStudents,
  );

  if (subjectTracking.length === 0) {
    throw new HttpError(
      400,
      "No subjects are assigned to this class for this year. Assign subjects under Academic → Class subjects first.",
    );
  }

  let requiredTracking = subjectTracking;
  if (options?.linkedExamId && ctx.track === "cbc") {
    const examPaperIds = await listCompulsoryExamPaperSubjectIds(options.linkedExamId);
    requiredTracking = termTrackingExcludingExamPapers(subjectTracking, examPaperIds);
  }

  const pending = requiredTracking.filter((s) => s.status !== "submitted");
  if (pending.length > 0 && !options?.allowPartial) {
    const names = pending.map((s) => s.subjectCode).join(", ");
    const examHint =
      options?.linkedExamId && ctx.track === "cbc"
        ? " (Compulsory papers on the formal exam use marks from that exam.)"
        : "";
    throw new HttpError(
      400,
      `Report cards cannot be generated yet. These subjects still need submitted compulsory exam marks: ${names}.${examHint} Follow up with the teachers listed in submission tracking.`,
    );
  }

  const assessmentConfig = await loadAssessmentConfig(activeTenantIdFromContext());
  const projectsExpected = Math.max(1, assessmentConfig.projectWork.expectedPerTerm);
  const projectWorkTracking = await listProjectWorkSubmissionTracking(
    classId,
    termId,
    ctx.academicYearId,
    activeStudents,
    projectsExpected,
    assessmentConfig.allowIncompleteCaOverride,
  );
  const projectWorkPending = projectWorkTracking.filter(
    (row) =>
      assessmentConfig.includeProjectWorkInTermGrade &&
      row.projectWorkRequired &&
      row.status !== "submitted" &&
      row.status !== "not_required",
  );
  if (projectWorkPending.length > 0 && !options?.allowPartial) {
    const names = projectWorkPending.map((s) => s.subjectCode).join(", ");
    throw new HttpError(
      400,
      `Report cards cannot be generated yet. Project work is incomplete for: ${names}. Teachers should enter project work under Assessment → Project work.`,
    );
  }

  const subjects = await listSubjectReadiness(classId, termId, ctx.academicYearId, ctx.track);

  return {
    ...ctx,
    subjects,
    subjectTracking,
    pendingSubjects: pending,
    projectWorkTracking,
    projectWorkPending,
    activeStudents,
  };
}
