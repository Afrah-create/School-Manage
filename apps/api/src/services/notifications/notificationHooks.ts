import { tenantContext, tenantQuery } from "../../config/db.js";
import {
  countPendingExamPapersWithEntrants,
  createNotification,
  listActiveExamManagerRecipients,
  listActiveHeadteacherIds,
  listExamPaperTeachers,
  notifyUsers,
} from "./notificationService.js";
import { examDetailLinkForRole } from "./examNotificationLinks.js";

function formatClassLabel(name: string, stream: string | null | undefined): string {
  const base = name.trim();
  const s = stream?.trim();
  return s ? `${base} ${s}` : base;
}

function logHookError(event: string, err: unknown): void {
  console.error(
    `[notifications] ${event} hook failed:`,
    err instanceof Error ? err.message : err,
  );
}

function runNotificationHook(tenantId: string, task: () => Promise<void>): void {
  void tenantContext.run(tenantId, async () => {
    try {
      await task();
    } catch (err) {
      logHookError("hook", err);
    }
  });
}

type ExamContext = {
  examId: string;
  examName: string;
  className: string;
  classStream: string | null;
  termNumber: number;
  classId: string;
  academicYearId: string;
};

async function loadExamContext(tenantId: string, examId: string): Promise<ExamContext | null> {
  const { rows } = await tenantQuery<{
    exam_name: string;
    class_name: string;
    class_stream: string | null;
    term_number: number;
    class_id: string;
    academic_year_id: string;
  }>(
    tenantId,
    `SELECT e.name AS exam_name, c.name AS class_name, c.stream AS class_stream,
            t.term_number, e.class_id, e.academic_year_id
     FROM exams e
     JOIN classes c ON c.id = e.class_id
     JOIN terms t ON t.id = e.term_id
     WHERE e.id = $1 AND e.deleted_at IS NULL`,
    [examId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    examId,
    examName: row.exam_name,
    className: row.class_name,
    classStream: row.class_stream,
    termNumber: row.term_number,
    classId: row.class_id,
    academicYearId: row.academic_year_id,
  };
}

/** Legacy CBC sheet submit → notify headteacher(s). */
export async function notifyAssessmentSubmitted(input: {
  tenantId: string;
  subjectId: string;
  classId: string;
  termId: string;
  yearId: string;
  submittedByUserId: string;
}): Promise<void> {
  const { tenantId } = input;

  const { rows } = await tenantQuery<{
    class_name: string;
    class_stream: string | null;
    subject_name: string;
    term_number: number;
  }>(
    tenantId,
    `SELECT c.name AS class_name, c.stream AS class_stream, s.name AS subject_name, t.term_number
     FROM classes c, subjects s, terms t
     WHERE c.id = $1 AND s.id = $2 AND t.id = $3`,
    [input.classId, input.subjectId, input.termId],
  );
  const ctx = rows[0];
  if (!ctx) return;

  const classLabel = formatClassLabel(ctx.class_name, ctx.class_stream);
  const title = `Term ${ctx.term_number} · ${ctx.subject_name} marks submitted`;
  const body = `${ctx.subject_name} (${classLabel}) was submitted and is ready for review.`;

  const headteachers = await listActiveHeadteacherIds(tenantId);
  if (headteachers.length === 0) return;

  await notifyUsers(headteachers, tenantId, {
    category: "assessment_submitted",
    title,
    body,
    link: "/headteacher/exams",
    metadata: {
      subjectId: input.subjectId,
      classId: input.classId,
      termId: input.termId,
      yearId: input.yearId,
      submittedByUserId: input.submittedByUserId,
      stage: "assessment_submitted",
    },
  });
}

/** Admin opens exam → notify assigned subject teachers. */
export async function notifyExamOpened(input: {
  tenantId: string;
  examId: string;
  openedByUserId?: string;
}): Promise<void> {
  const { tenantId, examId } = input;
  const ctx = await loadExamContext(tenantId, examId);
  if (!ctx) return;

  const classLabel = formatClassLabel(ctx.className, ctx.classStream);
  const teachers = await listExamPaperTeachers(
    tenantId,
    examId,
    ctx.classId,
    ctx.academicYearId,
  );
  if (teachers.length === 0) return;

  for (const teacher of teachers) {
    const papers =
      teacher.subjectCodes.length > 0 ? teacher.subjectCodes.join(", ") : "your assigned paper(s)";
    const title = `Exam open · ${ctx.examName}`;
    const body = `${ctx.examName} for ${classLabel} (Term ${ctx.termNumber}) is open for marking. Enter marks for ${papers}.`;

    await createNotification({
      userId: teacher.userId,
      tenantId,
      category: "exam_opened",
      title,
      body,
      link: examDetailLinkForRole(teacher.role, examId),
      metadata: {
        examId,
        examName: ctx.examName,
        classId: ctx.classId,
        classLabel,
        termNumber: ctx.termNumber,
        subjectCodes: teacher.subjectCodes,
        stage: "exam_opened",
        openedByUserId: input.openedByUserId ?? null,
      },
    });
  }
}

/** Teacher submits a paper → notify school leads. */
export async function notifyExamMarksSubmitted(input: {
  tenantId: string;
  examId: string;
  subjectId: string;
  submittedByUserId: string;
}): Promise<void> {
  const { tenantId, examId, subjectId } = input;
  const ctx = await loadExamContext(tenantId, examId);
  if (!ctx) return;

  const { rows: subjectRows } = await tenantQuery<{ subject_name: string; subject_code: string }>(
    tenantId,
    `SELECT name AS subject_name, code AS subject_code FROM subjects WHERE id = $1`,
    [subjectId],
  );
  const subject = subjectRows[0];
  if (!subject) return;

  const { rows: teacherRows } = await tenantQuery<{ full_name: string }>(
    tenantId,
    `SELECT full_name FROM users WHERE id = $1`,
    [input.submittedByUserId],
  );
  const teacherName = teacherRows[0]?.full_name?.trim() || "A teacher";

  const classLabel = formatClassLabel(ctx.className, ctx.classStream);
  const title = `Marks submitted · ${subject.subject_code}`;
  const body = `${teacherName} submitted ${subject.subject_name} (${subject.subject_code}) for ${ctx.examName} · ${classLabel}, Term ${ctx.termNumber}.`;

  const managers = await listActiveExamManagerRecipients(tenantId);
  for (const manager of managers) {
    await createNotification({
      userId: manager.userId,
      tenantId,
      category: "exam_marks_submitted",
      title,
      body,
      link: examDetailLinkForRole(manager.role, examId),
      metadata: {
        examId,
        examName: ctx.examName,
        subjectId,
        subjectCode: subject.subject_code,
        classLabel,
        submittedByUserId: input.submittedByUserId,
        stage: "exam_marks_submitted",
      },
    });
  }
}

/** All papers with entrants submitted → prompt admin to close exam. */
export async function notifyExamReadyToClose(input: {
  tenantId: string;
  examId: string;
}): Promise<void> {
  const { tenantId, examId } = input;
  const pending = await countPendingExamPapersWithEntrants(tenantId, examId);
  if (pending > 0) return;

  const ctx = await loadExamContext(tenantId, examId);
  if (!ctx) return;

  const classLabel = formatClassLabel(ctx.className, ctx.classStream);
  const title = `Ready to close · ${ctx.examName}`;
  const body = `All registered papers for ${ctx.examName} (${classLabel}, Term ${ctx.termNumber}) have been submitted. You can close the exam for report cards.`;

  const managers = await listActiveExamManagerRecipients(tenantId);
  for (const manager of managers) {
    await createNotification({
      userId: manager.userId,
      tenantId,
      category: "exam_ready_to_close",
      title,
      body,
      link: examDetailLinkForRole(manager.role, examId),
      metadata: {
        examId,
        examName: ctx.examName,
        classLabel,
        termNumber: ctx.termNumber,
        stage: "exam_ready_to_close",
      },
    });
  }
}

/** Exam closed → notify teachers that marking is locked. */
export async function notifyExamClosed(input: {
  tenantId: string;
  examId: string;
  closedByUserId?: string;
}): Promise<void> {
  const { tenantId, examId } = input;
  const ctx = await loadExamContext(tenantId, examId);
  if (!ctx) return;

  const classLabel = formatClassLabel(ctx.className, ctx.classStream);
  const teachers = await listExamPaperTeachers(
    tenantId,
    examId,
    ctx.classId,
    ctx.academicYearId,
  );
  if (teachers.length === 0) return;

  const title = `Exam closed · ${ctx.examName}`;
  const body = `${ctx.examName} for ${classLabel} has been closed. Marks are locked unless an administrator reopens the exam.`;

  for (const teacher of teachers) {
    await createNotification({
      userId: teacher.userId,
      tenantId,
      category: "exam_closed",
      title,
      body,
      link: examDetailLinkForRole(teacher.role, examId),
      metadata: {
        examId,
        examName: ctx.examName,
        classLabel,
        stage: "exam_closed",
        closedByUserId: input.closedByUserId ?? null,
      },
    });
  }
}

export function fireAssessmentSubmittedNotification(input: {
  tenantId: string;
  subjectId: string;
  classId: string;
  termId: string;
  yearId: string;
  submittedByUserId: string;
}): void {
  const { tenantId, ...rest } = input;
  runNotificationHook(tenantId, () => notifyAssessmentSubmitted({ tenantId, ...rest }));
}

export function fireExamOpenedNotification(input: {
  tenantId: string;
  examId: string;
  openedByUserId?: string;
}): void {
  const { tenantId, ...rest } = input;
  runNotificationHook(tenantId, () => notifyExamOpened({ tenantId, ...rest }));
}

export function fireExamMarksSubmittedNotification(input: {
  tenantId: string;
  examId: string;
  subjectId: string;
  submittedByUserId: string;
}): void {
  const { tenantId, ...rest } = input;
  runNotificationHook(tenantId, async () => {
    await notifyExamMarksSubmitted({ tenantId, ...rest });
    await notifyExamReadyToClose({ tenantId, examId: rest.examId });
  });
}

export function fireExamClosedNotification(input: {
  tenantId: string;
  examId: string;
  closedByUserId?: string;
}): void {
  const { tenantId, ...rest } = input;
  runNotificationHook(tenantId, () => notifyExamClosed({ tenantId, ...rest }));
}
