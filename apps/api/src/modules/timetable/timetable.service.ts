import type {
  CloneTimetableTemplateInput,
  CreateTimetableTemplateInput,
  TimetableBrowseItem,
  TimetableBrowseQuery,
  TimetableClassSubjectOption,
  TimetableDaysBulkInput,
  TimetableEntriesBulkSaveInput,
  TimetableGridView,
  TimetablePeriod,
  TimetablePeriodsBulkInput,
  TimetablePublicationLogEntry,
  TimetableSlotOccupancyView,
  TimetableSlotOccupant,
  TimetablePublishInput,
  TimetableTemplate,
  TimetableTemplateOverview,
  TimetableTemplateQuery,
  TimetableValidateResult,
  TeacherTodayView,
  TeacherWeekLesson,
  TeacherWeekView,
} from "@uganda-cbc-sms/shared";
import type { PoolClient } from "pg";
import { query, withTransaction } from "../../config/db";
import { HttpError } from "../../utils/httpError";
import {
  assertNoScheduleClashes,
  messageFromUniqueViolation,
  validationClashMessage,
} from "./timetableClashMessages";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_PERIODS: Array<{
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isTeaching: boolean;
}> = [
  { periodNumber: 1, label: "Period 1", startTime: "07:30", endTime: "08:10", isTeaching: true },
  { periodNumber: 2, label: "Period 2", startTime: "08:10", endTime: "08:50", isTeaching: true },
  { periodNumber: 3, label: "Period 3", startTime: "08:50", endTime: "09:30", isTeaching: true },
  { periodNumber: 4, label: "Break", startTime: "09:30", endTime: "09:50", isTeaching: false },
  { periodNumber: 5, label: "Period 4", startTime: "09:50", endTime: "10:30", isTeaching: true },
  { periodNumber: 6, label: "Period 5", startTime: "10:30", endTime: "11:10", isTeaching: true },
  { periodNumber: 7, label: "Period 6", startTime: "11:10", endTime: "11:50", isTeaching: true },
  { periodNumber: 8, label: "Lunch", startTime: "11:50", endTime: "12:30", isTeaching: false },
  { periodNumber: 9, label: "Period 7", startTime: "12:30", endTime: "13:10", isTeaching: true },
  { periodNumber: 10, label: "Period 8", startTime: "13:10", endTime: "13:50", isTeaching: true },
];

function normalizeLevel(level: string): "O_LEVEL" | "A_LEVEL" {
  return level === "o_level" || level === "O_LEVEL" ? "O_LEVEL" : "A_LEVEL";
}

function levelSqlVariants(level: "O_LEVEL" | "A_LEVEL"): string[] {
  return level === "O_LEVEL" ? ["O_LEVEL", "o_level"] : ["A_LEVEL", "a_level"];
}

async function getTemplateRow(templateId: string) {
  const { rows } = await query<{
    id: string;
    academic_year_id: string;
    term_id: string;
    level: string;
    name: string;
    status: "draft" | "published" | "archived";
    version: number;
    published_at: string | null;
    published_by: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT *
     FROM timetable_templates
     WHERE id = $1
     LIMIT 1`,
    [templateId],
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, "Timetable template not found");
  return row;
}

async function assertDraftTemplate(templateId: string) {
  const row = await getTemplateRow(templateId);
  if (row.status !== "draft") {
    throw new HttpError(400, "Only draft timetables can be edited. Create or open a draft to make changes.");
  }
  return row;
}

type TemplateRow = {
  id: string;
  academic_year_id: string;
  term_id: string;
  level: string;
  name: string;
  status: "draft" | "published" | "archived";
  version: number;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
};

async function mapTemplate(row: TemplateRow): Promise<TimetableTemplate> {
  const counts = await query<{ period_count: number; entry_count: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM timetable_periods WHERE template_id = $1) AS period_count,
       (SELECT COUNT(*)::int FROM timetable_entries WHERE template_id = $1) AS entry_count`,
    [row.id],
  );
  return {
    id: row.id,
    academicYearId: row.academic_year_id,
    termId: row.term_id,
    level: normalizeLevel(row.level),
    name: row.name,
    status: row.status,
    version: row.version,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    periodCount: counts.rows[0]?.period_count ?? 0,
    entryCount: counts.rows[0]?.entry_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function seedDefaultStructure(client: PoolClient, templateId: string) {
  for (const p of DEFAULT_PERIODS) {
    await client.query(
      `INSERT INTO timetable_periods (template_id, period_number, label, start_time, end_time, is_teaching)
       VALUES ($1, $2, $3, $4::time, $5::time, $6)`,
      [templateId, p.periodNumber, p.label, p.startTime, p.endTime, p.isTeaching],
    );
  }
  for (let d = 1; d <= 5; d++) {
    await client.query(
      `INSERT INTO timetable_days (template_id, day_of_week, is_school_day)
       VALUES ($1, $2, true)`,
      [templateId, d],
    );
  }
  for (let d = 6; d <= 7; d++) {
    await client.query(
      `INSERT INTO timetable_days (template_id, day_of_week, is_school_day)
       VALUES ($1, $2, false)`,
      [templateId, d],
    );
  }
}

async function buildTemplateName(
  academicYearId: string,
  termId: string,
  level: "O_LEVEL" | "A_LEVEL",
): Promise<string> {
  const { rows } = await query<{ year_name: string; term_number: number }>(
    `SELECT ay.name AS year_name, t.term_number
     FROM terms t
     JOIN academic_years ay ON ay.id = t.academic_year_id
     WHERE t.id = $1 AND ay.id = $2
     LIMIT 1`,
    [termId, academicYearId],
  );
  const r = rows[0];
  const levelLabel = level === "O_LEVEL" ? "O-Level" : "A-Level";
  if (!r) return `${levelLabel} Timetable`;
  return `Term ${r.term_number} ${r.year_name} · ${levelLabel}`;
}

export async function listTemplates(filters: TimetableTemplateQuery): Promise<TimetableTemplate[]> {
  const level = normalizeLevel(filters.level);
  const { rows } = await query(
    `SELECT *
     FROM timetable_templates
     WHERE academic_year_id = $1
       AND term_id = $2
       AND level = ANY($3::text[])
     ORDER BY CASE status WHEN 'draft' THEN 0 WHEN 'published' THEN 1 ELSE 2 END, updated_at DESC`,
    [filters.academicYearId, filters.termId, levelSqlVariants(level)],
  );
  return Promise.all(rows.map((r) => mapTemplate(r as TemplateRow)));
}

async function findActivePublishedTemplate(
  academicYearId: string,
  termId: string,
  level: "O_LEVEL" | "A_LEVEL",
): Promise<TemplateRow | null> {
  const { rows } = await query(
    `SELECT *
     FROM timetable_templates
     WHERE academic_year_id = $1
       AND term_id = $2
       AND level = ANY($3::text[])
       AND status = 'published'
     ORDER BY version DESC, updated_at DESC
     LIMIT 1`,
    [academicYearId, termId, levelSqlVariants(level)],
  );
  return (rows[0] as TemplateRow | undefined) ?? null;
}

async function copyClassEntriesFromPublishedIfEmpty(
  draftTemplateId: string,
  classId: string,
): Promise<void> {
  const draftRow = await getTemplateRow(draftTemplateId);
  if (draftRow.status !== "draft") return;

  const { rows: countRows } = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM timetable_entries WHERE template_id = $1 AND class_id = $2`,
    [draftTemplateId, classId],
  );
  if ((countRows[0]?.c ?? 0) > 0) return;

  const published = await findActivePublishedTemplate(
    draftRow.academic_year_id,
    draftRow.term_id,
    normalizeLevel(draftRow.level),
  );
  if (!published || published.id === draftTemplateId) return;

  const targetYear = draftRow.academic_year_id;

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO timetable_entries (template_id, day_of_week, period_id, class_id, class_subject_id, teacher_id)
       SELECT
         $1,
         se.day_of_week,
         tp.id,
         se.class_id,
         tcs.id,
         tcs.teacher_id
       FROM timetable_entries se
       JOIN timetable_periods sp ON sp.id = se.period_id
       JOIN timetable_periods tp ON tp.template_id = $1 AND tp.period_number = sp.period_number
       JOIN class_subjects scs ON scs.id = se.class_subject_id
       JOIN class_subjects tcs
         ON tcs.class_id = se.class_id
        AND tcs.subject_id = scs.subject_id
        AND tcs.academic_year_id = $2
       WHERE se.template_id = $3
         AND se.class_id = $4`,
      [draftTemplateId, targetYear, published.id, classId],
    );
    await client.query(`UPDATE timetable_templates SET updated_at = NOW() WHERE id = $1`, [draftTemplateId]);
  });
}

export async function getOrCreateDraft(filters: TimetableTemplateQuery): Promise<TimetableTemplate> {
  const level = normalizeLevel(filters.level);
  const existing = await query(
    `SELECT *
     FROM timetable_templates
     WHERE academic_year_id = $1
       AND term_id = $2
       AND level = ANY($3::text[])
       AND status = 'draft'
     LIMIT 1`,
    [filters.academicYearId, filters.termId, levelSqlVariants(level)],
  );
  if (existing.rows[0]) {
    return mapTemplate(existing.rows[0] as TemplateRow);
  }
  const created = await createTemplate({
    academicYearId: filters.academicYearId,
    termId: filters.termId,
    level,
  });
  const published = await findActivePublishedTemplate(
    filters.academicYearId,
    filters.termId,
    level,
  );
  if (published) {
    return cloneTemplate({
      sourceTemplateId: published.id,
      targetTemplateId: created.id,
      copyEntries: true,
    });
  }
  return created;
}

export async function createTemplate(input: CreateTimetableTemplateInput): Promise<TimetableTemplate> {
  const level = normalizeLevel(input.level);
  const name = input.name ?? (await buildTemplateName(input.academicYearId, input.termId, level));

  return withTransaction(async (client) => {
    const dup = await client.query(
      `SELECT id FROM timetable_templates
       WHERE academic_year_id = $1 AND term_id = $2 AND level = ANY($3::text[]) AND status = 'draft'
       LIMIT 1`,
      [input.academicYearId, input.termId, levelSqlVariants(level)],
    );
    if (dup.rows[0]) {
      throw new HttpError(409, "A draft timetable already exists for this year, term, and level.");
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO timetable_templates (academic_year_id, term_id, level, name, status, version)
       VALUES ($1, $2, $3, $4, 'draft', 0)
       RETURNING id`,
      [input.academicYearId, input.termId, level, name],
    );
    const templateId = inserted.rows[0]!.id;
    await seedDefaultStructure(client, templateId);
    const row = await client.query(`SELECT * FROM timetable_templates WHERE id = $1`, [templateId]);
    return mapTemplate(row.rows[0] as TemplateRow);
  });
}

export async function getTemplate(templateId: string): Promise<TimetableTemplate> {
  return mapTemplate(await getTemplateRow(templateId));
}

export async function getPeriods(templateId: string): Promise<TimetablePeriod[]> {
  const { rows } = await query<{
    id: string;
    period_number: number;
    label: string;
    start_time: string;
    end_time: string;
    is_teaching: boolean;
  }>(
    `SELECT id, period_number, label, start_time::text, end_time::text, is_teaching
     FROM timetable_periods
     WHERE template_id = $1
     ORDER BY period_number`,
    [templateId],
  );
  return rows.map((r) => ({
    id: r.id,
    periodNumber: r.period_number,
    label: r.label,
    startTime: r.start_time.slice(0, 5),
    endTime: r.end_time.slice(0, 5),
    isTeaching: r.is_teaching,
  }));
}

export async function replacePeriods(templateId: string, input: TimetablePeriodsBulkInput): Promise<TimetablePeriod[]> {
  await assertDraftTemplate(templateId);
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM timetable_periods WHERE template_id = $1`, [templateId]);
    for (const p of input.periods) {
      await client.query(
        `INSERT INTO timetable_periods (template_id, period_number, label, start_time, end_time, is_teaching)
         VALUES ($1, $2, $3, $4::time, $5::time, $6)`,
        [templateId, p.periodNumber, p.label, p.startTime, p.endTime, p.isTeaching],
      );
    }
    await client.query(`UPDATE timetable_templates SET updated_at = NOW() WHERE id = $1`, [templateId]);
  });
  return getPeriods(templateId);
}

export async function getDays(templateId: string) {
  const { rows } = await query<{ id: string; day_of_week: number; is_school_day: boolean }>(
    `SELECT id, day_of_week, is_school_day
     FROM timetable_days
     WHERE template_id = $1
     ORDER BY day_of_week`,
    [templateId],
  );
  return rows.map((r) => ({
    id: r.id,
    dayOfWeek: r.day_of_week,
    isSchoolDay: r.is_school_day,
  }));
}

export async function replaceDays(templateId: string, input: TimetableDaysBulkInput) {
  await assertDraftTemplate(templateId);
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM timetable_days WHERE template_id = $1`, [templateId]);
    for (const d of input.days) {
      await client.query(
        `INSERT INTO timetable_days (template_id, day_of_week, is_school_day)
         VALUES ($1, $2, $3)`,
        [templateId, d.dayOfWeek, d.isSchoolDay],
      );
    }
    await client.query(`UPDATE timetable_templates SET updated_at = NOW() WHERE id = $1`, [templateId]);
  });
  return getDays(templateId);
}

export async function listClassSubjectsForTemplate(
  templateId: string,
  classId: string,
): Promise<TimetableClassSubjectOption[]> {
  const tpl = await getTemplateRow(templateId);
  const level = normalizeLevel(tpl.level);
  const { rows } = await query<{
    id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    teacher_id: string | null;
    teacher_name: string | null;
  }>(
    `SELECT
       cs.id,
       s.id AS subject_id,
       s.name AS subject_name,
       s.code AS subject_code,
       cs.teacher_id,
       u.full_name AS teacher_name
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN users u ON u.id = cs.teacher_id
     WHERE cs.class_id = $1
       AND cs.academic_year_id = $2
       AND c.level = ANY($3::text[])
     ORDER BY s.name`,
    [classId, tpl.academic_year_id, levelSqlVariants(level)],
  );
  return rows.map((r) => ({
    classSubjectId: r.id,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    subjectCode: r.subject_code,
    teacherId: r.teacher_id,
    teacherName: r.teacher_name,
  }));
}

export async function getSlotOccupancy(
  templateId: string,
  excludeClassId?: string,
): Promise<TimetableSlotOccupancyView> {
  await getTemplateRow(templateId);

  const params: unknown[] = [templateId];
  let excludeSql = "";
  if (excludeClassId) {
    params.push(excludeClassId);
    excludeSql = `AND e.class_id <> $${params.length}::uuid`;
  }

  const { rows } = await query<{
    day_of_week: number;
    period_id: string;
    class_id: string;
    class_name: string;
    class_stream: string | null;
    subject_code: string;
    subject_name: string;
    teacher_id: string | null;
    teacher_name: string | null;
    class_subject_id: string;
  }>(
    `SELECT
       e.day_of_week,
       e.period_id,
       e.class_id,
       c.name AS class_name,
       c.stream AS class_stream,
       s.code AS subject_code,
       s.name AS subject_name,
       e.teacher_id,
       u.full_name AS teacher_name,
       e.class_subject_id
     FROM timetable_entries e
     JOIN classes c ON c.id = e.class_id
     JOIN class_subjects cs ON cs.id = e.class_subject_id
     JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN users u ON u.id = e.teacher_id
     WHERE e.template_id = $1
       ${excludeSql}
     ORDER BY e.day_of_week, e.period_id`,
    params,
  );

  const bySlot: Record<string, TimetableSlotOccupant[]> = {};
  for (const r of rows) {
    const key = `${r.day_of_week}:${r.period_id}`;
    const list = bySlot[key] ?? [];
    list.push({
      classId: r.class_id,
      className: r.class_name,
      classStream: r.class_stream ?? "",
      subjectCode: r.subject_code,
      subjectName: r.subject_name,
      teacherId: r.teacher_id,
      teacherName: r.teacher_name,
      classSubjectId: r.class_subject_id,
    });
    bySlot[key] = list;
  }

  return { bySlot };
}

async function validateClassSubjectSlot(
  templateRow: TemplateRow,
  classId: string,
  classSubjectId: string,
): Promise<{ teacherId: string }> {
  const level = normalizeLevel(templateRow.level);
  const { rows } = await query<{ teacher_id: string | null }>(
    `SELECT cs.teacher_id
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     WHERE cs.id = $1
       AND cs.class_id = $2
       AND cs.academic_year_id = $3
       AND c.level = ANY($4::text[])
     LIMIT 1`,
    [classSubjectId, classId, templateRow.academic_year_id, levelSqlVariants(level)],
  );
  if (!rows[0]) {
    throw new HttpError(400, "Selected subject is not on this class instructional timetable for this year and level.");
  }
  if (!rows[0].teacher_id) {
    throw new HttpError(400, "Assign a subject teacher before scheduling this subject.");
  }
  return { teacherId: rows[0].teacher_id };
}

export async function saveClassGrid(
  templateId: string,
  classId: string,
  input: TimetableEntriesBulkSaveInput,
): Promise<TimetableGridView> {
  const tpl = await assertDraftTemplate(templateId);
  const periods = await getPeriods(templateId);
  const days = await getDays(templateId);
  const teachingPeriodIds = new Set(periods.filter((p) => p.isTeaching).map((p) => p.id));
  const schoolDays = new Set(days.filter((d) => d.isSchoolDay).map((d) => d.dayOfWeek));
  const periodIdSet = new Set(periods.map((p) => p.id));

  for (const e of input.entries) {
    if (!schoolDays.has(e.dayOfWeek)) {
      throw new HttpError(400, `Day ${DAY_NAMES[e.dayOfWeek] ?? e.dayOfWeek} is not a school day.`);
    }
    if (!periodIdSet.has(e.periodId)) {
      throw new HttpError(400, "Invalid period for this template.");
    }
    if (!teachingPeriodIds.has(e.periodId)) {
      throw new HttpError(400, "Cannot schedule lessons during break or non-teaching periods.");
    }
    await validateClassSubjectSlot(tpl, classId, e.classSubjectId);
  }

  const teacherBySubject = new Map<string, string>();
  for (const e of input.entries) {
    const { teacherId } = await validateClassSubjectSlot(tpl, classId, e.classSubjectId);
    teacherBySubject.set(e.classSubjectId, teacherId);
  }

  await assertNoScheduleClashes(
    templateId,
    classId,
    input.entries,
    periods,
    async (classSubjectId) => teacherBySubject.get(classSubjectId)!,
  );

  try {
    await withTransaction(async (client) => {
      await client.query(
        `DELETE FROM timetable_entries
         WHERE template_id = $1 AND class_id = $2`,
        [templateId, classId],
      );
      for (const e of input.entries) {
        const teacherId = teacherBySubject.get(e.classSubjectId)!;
        await client.query(
          `INSERT INTO timetable_entries
             (template_id, day_of_week, period_id, class_id, class_subject_id, teacher_id, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [templateId, e.dayOfWeek, e.periodId, classId, e.classSubjectId, teacherId],
        );
      }
      await client.query(`UPDATE timetable_templates SET updated_at = NOW() WHERE id = $1`, [templateId]);
    });
  } catch (err: unknown) {
    if (err instanceof HttpError) throw err;
    const pgMsg =
      typeof err === "object" && err !== null
        ? messageFromUniqueViolation(err as { code?: string; constraint?: string; detail?: string }, periods)
        : null;
    if (pgMsg) throw new HttpError(409, pgMsg);
    throw err;
  }

  return getClassGrid(templateId, classId);
}

export async function getClassGrid(templateId: string, classId: string): Promise<TimetableGridView> {
  const tplRow = await getTemplateRow(templateId);
  if (tplRow.status === "draft") {
    await copyClassEntriesFromPublishedIfEmpty(templateId, classId);
  }
  const tpl = await mapTemplate(tplRow);
  const periods = await getPeriods(templateId);
  const days = await getDays(templateId);
  const schoolDays = days.filter((d) => d.isSchoolDay);

  const { rows } = await query<{
    id: string;
    day_of_week: number;
    period_id: string;
    class_subject_id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    teacher_id: string | null;
    teacher_name: string | null;
  }>(
    `SELECT
       e.id,
       e.day_of_week,
       e.period_id,
       e.class_subject_id,
       s.id AS subject_id,
       s.name AS subject_name,
       s.code AS subject_code,
       e.teacher_id,
       u.full_name AS teacher_name
     FROM timetable_entries e
     JOIN class_subjects cs ON cs.id = e.class_subject_id
     JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN users u ON u.id = e.teacher_id
     WHERE e.template_id = $1 AND e.class_id = $2`,
    [templateId, classId],
  );

  const entryMap = new Map<string, (typeof rows)[0]>();
  for (const r of rows) {
    entryMap.set(`${r.day_of_week}:${r.period_id}`, r);
  }

  const cells: TimetableGridView["cells"] = [];
  for (const day of schoolDays) {
    for (const period of periods) {
      const hit = entryMap.get(`${day.dayOfWeek}:${period.id}`);
      cells.push({
        dayOfWeek: day.dayOfWeek,
        periodId: period.id,
        entryId: hit?.id ?? null,
        classSubjectId: hit?.class_subject_id ?? null,
        subjectId: hit?.subject_id ?? null,
        subjectName: hit?.subject_name ?? null,
        subjectCode: hit?.subject_code ?? null,
        teacherId: hit?.teacher_id ?? null,
        teacherName: hit?.teacher_name ?? null,
        classId,
        className: null,
        classStream: null,
      });
    }
  }

  return {
    template: {
      id: tpl.id,
      status: tpl.status,
      level: tpl.level,
      name: tpl.name,
      version: tpl.version,
    },
    periods,
    days,
    cells,
    classId,
  };
}

export async function getTeacherGrid(templateId: string, teacherId: string): Promise<TimetableGridView> {
  const tpl = await getTemplate(templateId);
  const periods = await getPeriods(templateId);
  const days = await getDays(templateId);
  const schoolDays = days.filter((d) => d.isSchoolDay);

  const { rows } = await query<{
    id: string;
    day_of_week: number;
    period_id: string;
    class_id: string;
    class_name: string;
    class_stream: string | null;
    class_subject_id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    teacher_id: string | null;
    teacher_name: string | null;
  }>(
    `SELECT
       e.id,
       e.day_of_week,
       e.period_id,
       e.class_id,
       c.name AS class_name,
       c.stream AS class_stream,
       e.class_subject_id,
       s.id AS subject_id,
       s.name AS subject_name,
       s.code AS subject_code,
       e.teacher_id,
       u.full_name AS teacher_name
     FROM timetable_entries e
     JOIN classes c ON c.id = e.class_id
     JOIN class_subjects cs ON cs.id = e.class_subject_id
     JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN users u ON u.id = e.teacher_id
     WHERE e.template_id = $1 AND e.teacher_id = $2`,
    [templateId, teacherId],
  );

  const entryMap = new Map<string, (typeof rows)[0]>();
  for (const r of rows) {
    entryMap.set(`${r.day_of_week}:${r.period_id}`, r);
  }

  const cells: TimetableGridView["cells"] = [];
  for (const day of schoolDays) {
    for (const period of periods) {
      const hit = entryMap.get(`${day.dayOfWeek}:${period.id}`);
      cells.push({
        dayOfWeek: day.dayOfWeek,
        periodId: period.id,
        entryId: hit?.id ?? null,
        classSubjectId: hit?.class_subject_id ?? null,
        subjectId: hit?.subject_id ?? null,
        subjectName: hit?.subject_name ?? null,
        subjectCode: hit?.subject_code ?? null,
        teacherId: hit?.teacher_id ?? null,
        teacherName: hit?.teacher_name ?? null,
        classId: hit?.class_id ?? null,
        className: hit?.class_name ?? null,
        classStream: hit?.class_stream ?? null,
      });
    }
  }

  return {
    template: {
      id: tpl.id,
      status: tpl.status,
      level: tpl.level,
      name: tpl.name,
      version: tpl.version,
    },
    periods,
    days,
    cells,
    teacherId,
  };
}

export async function validateTemplate(templateId: string): Promise<TimetableValidateResult> {
  const tpl = await getTemplateRow(templateId);
  const periods = await getPeriods(templateId);
  const errors: TimetableValidateResult["errors"] = [];
  const warnings: TimetableValidateResult["warnings"] = [];

  const clashes = await query<{
    kind: string;
    day_of_week: number;
    period_id: string;
    cnt: number;
  }>(
    `SELECT 'class' AS kind, day_of_week, period_id, COUNT(*)::int AS cnt
     FROM timetable_entries
     WHERE template_id = $1
     GROUP BY day_of_week, period_id, class_id
     HAVING COUNT(*) > 1
     UNION ALL
     SELECT 'teacher', day_of_week, period_id, COUNT(*)::int
     FROM timetable_entries
     WHERE template_id = $1 AND teacher_id IS NOT NULL
     GROUP BY day_of_week, period_id, teacher_id
     HAVING COUNT(*) > 1`,
    [templateId],
  );
  for (const c of clashes.rows) {
    const kind = c.kind === "class" ? "class" : "teacher";
    errors.push({
      code: c.kind === "class" ? "CLASS_CLASH" : "TEACHER_CLASH",
      message: validationClashMessage(kind, c.day_of_week, c.period_id, periods),
      dayOfWeek: c.day_of_week,
      periodId: c.period_id,
    });
  }

  const unscheduled = await query<{ class_subject_id: string; subject_name: string; class_name: string }>(
    `SELECT cs.id AS class_subject_id, s.name AS subject_name, c.name AS class_name
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     JOIN subjects s ON s.id = cs.subject_id
     WHERE cs.academic_year_id = $1
       AND c.level = ANY($2::text[])
       AND cs.teacher_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM timetable_entries e
         WHERE e.template_id = $3 AND e.class_subject_id = cs.id
       )`,
    [tpl.academic_year_id, levelSqlVariants(normalizeLevel(tpl.level)), templateId],
  );
  for (const u of unscheduled.rows) {
    warnings.push({
      code: "UNSCHEDULED_SUBJECT",
      message: `${u.subject_name} on ${u.class_name} has no scheduled periods.`,
      classSubjectId: u.class_subject_id,
    });
  }

  const overload = await query<{ teacher_id: string; teacher_name: string; day_of_week: number; cnt: number }>(
    `SELECT e.teacher_id, u.full_name AS teacher_name, e.day_of_week, COUNT(*)::int AS cnt
     FROM timetable_entries e
     JOIN users u ON u.id = e.teacher_id
     WHERE e.template_id = $1
     GROUP BY e.teacher_id, u.full_name, e.day_of_week
     HAVING COUNT(*) > 8`,
    [templateId],
  );
  for (const o of overload.rows) {
    warnings.push({
      code: "TEACHER_OVERLOAD",
      message: `${o.teacher_name} has ${o.cnt} periods on ${DAY_NAMES[o.day_of_week]} (max 8 recommended).`,
      teacherId: o.teacher_id,
      dayOfWeek: o.day_of_week,
    });
  }

  return {
    errors,
    warnings,
    canPublish: errors.length === 0,
  };
}

export async function publishTemplate(
  templateId: string,
  userId: string,
  input: TimetablePublishInput,
): Promise<TimetableTemplate> {
  const tpl = await assertDraftTemplate(templateId);
  const report = await validateTemplate(templateId);
  if (!report.canPublish) {
    throw new HttpError(400, "Fix validation errors before publishing.");
  }
  if (report.warnings.length > 0 && !input.acknowledgeWarnings) {
    throw new HttpError(
      400,
      `There are ${report.warnings.length} warning(s). Confirm publish with acknowledgeWarnings=true.`,
    );
  }

  return withTransaction(async (client) => {
    await client.query(
      `UPDATE timetable_templates
       SET status = 'archived', updated_at = NOW()
       WHERE academic_year_id = $1
         AND term_id = $2
         AND level = ANY($3::text[])
         AND status = 'published'`,
      [tpl.academic_year_id, tpl.term_id, levelSqlVariants(normalizeLevel(tpl.level))],
    );

    const nextVersion = tpl.version + 1;
    const entryCount = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM timetable_entries WHERE template_id = $1`,
      [templateId],
    );

    await client.query(
      `UPDATE timetable_templates
       SET status = 'published',
           version = $2,
           published_at = NOW(),
           published_by = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [templateId, nextVersion, userId],
    );

    await client.query(
      `INSERT INTO timetable_publication_log (template_id, version, published_by, entry_count, validation_summary)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        templateId,
        nextVersion,
        userId,
        entryCount.rows[0]?.c ?? 0,
        JSON.stringify({ warnings: report.warnings.length, errors: report.errors.length }),
      ],
    );

    const row = await client.query(`SELECT * FROM timetable_templates WHERE id = $1`, [templateId]);
    return mapTemplate(row.rows[0] as TemplateRow);
  });
}

export async function cloneTemplate(input: CloneTimetableTemplateInput): Promise<TimetableTemplate> {
  const source = await getTemplateRow(input.sourceTemplateId);
  let targetId = input.targetTemplateId;

  if (!targetId) {
    if (!input.academicYearId || !input.termId || !input.level) {
      throw new HttpError(400, "Provide targetTemplateId or academicYearId, termId, and level.");
    }
    const created = await createTemplate({
      academicYearId: input.academicYearId,
      termId: input.termId,
      level: input.level,
    });
    targetId = created.id;
  } else {
    await assertDraftTemplate(targetId);
  }

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM timetable_periods WHERE template_id = $1`, [targetId]);
    await client.query(`DELETE FROM timetable_days WHERE template_id = $1`, [targetId]);
    await client.query(`DELETE FROM timetable_entries WHERE template_id = $1`, [targetId]);

    await client.query(
      `INSERT INTO timetable_periods (template_id, period_number, label, start_time, end_time, is_teaching)
       SELECT $1, period_number, label, start_time, end_time, is_teaching
       FROM timetable_periods
       WHERE template_id = $2`,
      [targetId, source.id],
    );
    await client.query(
      `INSERT INTO timetable_days (template_id, day_of_week, is_school_day)
       SELECT $1, day_of_week, is_school_day
       FROM timetable_days
       WHERE template_id = $2`,
      [targetId, source.id],
    );

    if (input.copyEntries) {
      const targetTpl = await client.query<{ academic_year_id: string; level: string }>(
        `SELECT academic_year_id, level FROM timetable_templates WHERE id = $1`,
        [targetId],
      );
      const targetYear = targetTpl.rows[0]!.academic_year_id;
      const targetLevel = normalizeLevel(targetTpl.rows[0]!.level);

      await client.query(
        `INSERT INTO timetable_entries (template_id, day_of_week, period_id, class_id, class_subject_id, teacher_id)
         SELECT
           $1,
           se.day_of_week,
           tp.id,
           se.class_id,
           tcs.id,
           tcs.teacher_id
         FROM timetable_entries se
         JOIN timetable_periods sp ON sp.id = se.period_id
         JOIN timetable_periods tp ON tp.template_id = $1 AND tp.period_number = sp.period_number
         JOIN class_subjects scs ON scs.id = se.class_subject_id
         JOIN class_subjects tcs
           ON tcs.class_id = se.class_id
          AND tcs.subject_id = scs.subject_id
          AND tcs.academic_year_id = $2
         JOIN classes c ON c.id = se.class_id AND c.level = ANY($3::text[])
         WHERE se.template_id = $4`,
        [targetId, targetYear, levelSqlVariants(targetLevel), source.id],
      );
    }

    await client.query(`UPDATE timetable_templates SET updated_at = NOW() WHERE id = $1`, [targetId]);
  });

  return getTemplate(targetId!);
}

export async function getPublicationLog(templateId: string): Promise<TimetablePublicationLogEntry[]> {
  const { rows } = await query<{
    id: string;
    template_id: string;
    version: number;
    published_by: string | null;
    published_by_name: string | null;
    published_at: string;
    entry_count: number;
    validation_summary: Record<string, unknown> | null;
  }>(
    `SELECT l.*, u.full_name AS published_by_name
     FROM timetable_publication_log l
     LEFT JOIN users u ON u.id = l.published_by
     WHERE l.template_id = $1
     ORDER BY l.published_at DESC`,
    [templateId],
  );
  return rows.map((r) => ({
    id: r.id,
    templateId: r.template_id,
    version: r.version,
    publishedBy: r.published_by,
    publishedByName: r.published_by_name,
    publishedAt: r.published_at,
    entryCount: r.entry_count,
    validationSummary: r.validation_summary,
  }));
}

export async function browsePublishedTimetables(
  filters: TimetableBrowseQuery,
): Promise<TimetableBrowseItem[]> {
  const params: unknown[] = [];
  const parts: string[] = [`tt.status IN ('published', 'archived')`];

  if (filters.status === "active") {
    parts[0] = `tt.status = 'published'`;
  } else if (filters.status === "archived") {
    parts[0] = `tt.status = 'archived'`;
  }

  if (filters.academicYearId) {
    params.push(filters.academicYearId);
    parts.push(`tt.academic_year_id = $${params.length}::uuid`);
  }
  if (filters.termId) {
    params.push(filters.termId);
    parts.push(`tt.term_id = $${params.length}::uuid`);
  }
  if (filters.level) {
    const level = normalizeLevel(filters.level);
    params.push(levelSqlVariants(level));
    parts.push(`tt.level = ANY($${params.length}::text[])`);
  }

  const { rows } = await query<
    TemplateRow & {
      academic_year_name: string;
      term_number: number;
      published_by_name: string | null;
      class_count: number;
      teacher_count: number;
      entry_count: number;
      period_count: number;
    }
  >(
    `SELECT
       tt.*,
       ay.name AS academic_year_name,
       t.term_number,
       u.full_name AS published_by_name,
       COALESCE(ec.class_count, 0)::int AS class_count,
       COALESCE(ec.teacher_count, 0)::int AS teacher_count,
       COALESCE(ec.entry_count, 0)::int AS entry_count,
       COALESCE(pc.period_count, 0)::int AS period_count
     FROM timetable_templates tt
     JOIN academic_years ay ON ay.id = tt.academic_year_id
     JOIN terms t ON t.id = tt.term_id
     LEFT JOIN users u ON u.id = tt.published_by
     LEFT JOIN (
       SELECT
         template_id,
         COUNT(*)::int AS entry_count,
         COUNT(DISTINCT class_id)::int AS class_count,
         COUNT(DISTINCT teacher_id)::int AS teacher_count
       FROM timetable_entries
       GROUP BY template_id
     ) ec ON ec.template_id = tt.id
     LEFT JOIN (
       SELECT template_id, COUNT(*)::int AS period_count
       FROM timetable_periods
       WHERE is_teaching = true
       GROUP BY template_id
     ) pc ON pc.template_id = tt.id
     WHERE ${parts.join(" AND ")}
     ORDER BY
       CASE tt.status WHEN 'published' THEN 0 ELSE 1 END,
       tt.published_at DESC NULLS LAST,
       tt.updated_at DESC`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    academicYearId: r.academic_year_id,
    termId: r.term_id,
    level: normalizeLevel(r.level),
    name: r.name,
    status: r.status,
    version: r.version,
    publishedAt: r.published_at,
    publishedBy: r.published_by,
    periodCount: r.period_count,
    entryCount: r.entry_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    academicYearName: r.academic_year_name,
    termNumber: r.term_number,
    publishedByName: r.published_by_name,
    classCount: r.class_count,
    teacherCount: r.teacher_count,
    isActive: r.status === "published",
  }));
}

export async function getTemplateOverview(templateId: string): Promise<TimetableTemplateOverview> {
  const tpl = await getTemplate(templateId);
  if (tpl.status === "draft") {
    throw new HttpError(400, "Draft timetables cannot be browsed here. Use the timetable builder to edit drafts.");
  }

  const metaQ = await query<{
    academic_year_name: string;
    term_number: number;
    published_by_name: string | null;
    teaching_period_count: number;
    school_day_count: number;
  }>(
    `SELECT
       ay.name AS academic_year_name,
       t.term_number,
       u.full_name AS published_by_name,
       (SELECT COUNT(*)::int FROM timetable_periods WHERE template_id = $1 AND is_teaching = true) AS teaching_period_count,
       (SELECT COUNT(*)::int FROM timetable_days WHERE template_id = $1 AND is_school_day = true) AS school_day_count
     FROM timetable_templates tt
     JOIN academic_years ay ON ay.id = tt.academic_year_id
     JOIN terms t ON t.id = tt.term_id
     LEFT JOIN users u ON u.id = tt.published_by
     WHERE tt.id = $1`,
    [templateId],
  );
  const meta = metaQ.rows[0];
  if (!meta) throw new HttpError(404, "Timetable template not found");

  const templateLevel = normalizeLevel(tpl.level);

  const [classesQ, teachersQ] = await Promise.all([
    query<{
      class_id: string;
      class_name: string;
      class_stream: string | null;
      lesson_count: number;
    }>(
      `SELECT
         c.id AS class_id,
         c.name AS class_name,
         c.stream AS class_stream,
         COALESCE(ec.lesson_count, 0)::int AS lesson_count
       FROM classes c
       LEFT JOIN (
         SELECT class_id, COUNT(*)::int AS lesson_count
         FROM timetable_entries
         WHERE template_id = $1
         GROUP BY class_id
       ) ec ON ec.class_id = c.id
       WHERE c.academic_year_id = $2
         AND c.level = ANY($3::text[])
       ORDER BY c.name, c.stream NULLS LAST, c.stream`,
      [templateId, tpl.academicYearId, levelSqlVariants(templateLevel)],
    ),
    query<{ teacher_id: string; teacher_name: string; lesson_count: number }>(
      `SELECT
         u.id AS teacher_id,
         u.full_name AS teacher_name,
         COUNT(*)::int AS lesson_count
       FROM timetable_entries e
       JOIN users u ON u.id = e.teacher_id
       WHERE e.template_id = $1
       GROUP BY u.id, u.full_name
       ORDER BY u.full_name`,
      [templateId],
    ),
  ]);

  return {
    template: tpl,
    academicYearName: meta.academic_year_name,
    termNumber: meta.term_number,
    publishedByName: meta.published_by_name,
    stats: {
      entryCount: tpl.entryCount,
      classCount: classesQ.rows.length,
      teacherCount: teachersQ.rows.length,
      teachingPeriodCount: meta.teaching_period_count,
      schoolDayCount: meta.school_day_count,
    },
    classes: classesQ.rows.map((r) => ({
      classId: r.class_id,
      className: r.class_name,
      classStream: r.class_stream ?? "",
      lessonCount: r.lesson_count,
    })),
    teachers: teachersQ.rows.map((r) => ({
      teacherId: r.teacher_id,
      teacherName: r.teacher_name,
      lessonCount: r.lesson_count,
    })),
  };
}

async function getActiveYearTerm() {
  const yearQ = await query<{ id: string }>(
    `SELECT id FROM academic_years WHERE is_active = true ORDER BY start_date DESC LIMIT 1`,
  );
  const yearId = yearQ.rows[0]?.id;
  if (!yearId) return null;
  const termQ = await query<{ id: string }>(
    `SELECT id FROM terms WHERE academic_year_id = $1 AND is_active = true ORDER BY term_number LIMIT 1`,
    [yearId],
  );
  return { yearId, termId: termQ.rows[0]?.id ?? null };
}

async function getPublishedTemplatesForScope(yearId: string, termId: string) {
  const { rows } = await query<{
    id: string;
    level: string;
    term_id: string;
    version: number;
  }>(
    `SELECT id, level, term_id, version
     FROM timetable_templates
     WHERE academic_year_id = $1
       AND term_id = $2
       AND status = 'published'`,
    [yearId, termId],
  );
  return rows;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mondayOfWeek(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

type TeacherLessonBase = Omit<
  TeacherWeekLesson,
  "attendanceRegisterId" | "attendanceStatus" | "studentCount"
>;

async function enrichTeacherLessonsWithAttendance(
  lessons: TeacherLessonBase[],
): Promise<TeacherWeekLesson[]> {
  if (lessons.length === 0) return [];

  const entryIds = lessons.map((l) => l.timetableEntryId);
  const dates = [...new Set(lessons.map((l) => l.date))];
  const classIds = [...new Set(lessons.map((l) => l.classId))];

  const [regQ, countQ] = await Promise.all([
    query<{
      timetable_entry_id: string;
      date: string;
      id: string;
      status: "draft" | "submitted" | "locked";
    }>(
      `SELECT timetable_entry_id, date::text, id, status
       FROM attendance_registers
       WHERE timetable_entry_id = ANY($1::uuid[])
         AND date = ANY($2::date[])
         AND register_type = 'lesson'`,
      [entryIds, dates],
    ),
    query<{ class_id: string; cnt: number }>(
      `SELECT class_id, COUNT(*)::int AS cnt
       FROM students
       WHERE class_id = ANY($1::uuid[])
         AND status = 'active'
       GROUP BY class_id`,
      [classIds],
    ),
  ]);

  const regMap = new Map(
    regQ.rows.map((r) => [`${r.timetable_entry_id}:${r.date}`, r] as const),
  );
  const countMap = new Map(countQ.rows.map((r) => [r.class_id, r.cnt] as const));

  return lessons.map((l) => {
    const reg = regMap.get(`${l.timetableEntryId}:${l.date}`);
    const attendanceStatus: TeacherWeekLesson["attendanceStatus"] = !reg
      ? "none"
      : reg.status === "draft"
        ? "draft"
        : reg.status === "locked"
          ? "locked"
          : "submitted";
    return {
      ...l,
      attendanceRegisterId: reg?.id ?? null,
      attendanceStatus,
      studentCount: countMap.get(l.classId) ?? 0,
    };
  });
}

export async function getTeacherWeek(teacherId: string, weekStart?: string): Promise<TeacherWeekView> {
  const scope = await getActiveYearTerm();
  if (!scope?.termId) {
    return { weekStart: weekStart ?? isoDate(new Date()), weekEnd: weekStart ?? isoDate(new Date()), lessons: [], templatesUsed: [] };
  }

  const start = weekStart ? new Date(weekStart + "T12:00:00") : mondayOfWeek(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const templates = await getPublishedTemplatesForScope(scope.yearId, scope.termId);
  if (templates.length === 0) {
    return {
      weekStart: isoDate(start),
      weekEnd: isoDate(end),
      lessons: [],
      templatesUsed: [],
    };
  }

  const templateIds = templates.map((t) => t.id);
  const { rows } = await query<{
    entry_id: string;
    class_subject_id: string;
    template_id: string;
    template_version: number;
    level: string;
    day_of_week: number;
    period_id: string;
    period_number: number;
    period_label: string;
    start_time: string;
    end_time: string;
    class_id: string;
    class_name: string;
    class_stream: string | null;
    subject_id: string;
    subject_name: string;
    subject_code: string;
  }>(
    `SELECT
       e.id AS entry_id,
       e.class_subject_id,
       e.template_id,
       tt.version AS template_version,
       tt.level,
       e.day_of_week,
       p.id AS period_id,
       p.period_number,
       p.label AS period_label,
       p.start_time::text,
       p.end_time::text,
       e.class_id,
       c.name AS class_name,
       c.stream AS class_stream,
       s.id AS subject_id,
       s.name AS subject_name,
       s.code AS subject_code
     FROM timetable_entries e
     JOIN timetable_templates tt ON tt.id = e.template_id
     JOIN timetable_periods p ON p.id = e.period_id
     JOIN classes c ON c.id = e.class_id
     JOIN class_subjects cs ON cs.id = e.class_subject_id
     JOIN subjects s ON s.id = cs.subject_id
     WHERE e.template_id = ANY($1::uuid[])
       AND e.teacher_id = $2
       AND p.is_teaching = true
     ORDER BY e.day_of_week, p.period_number`,
    [templateIds, teacherId],
  );

  const baseLessons = rows.map((r) => {
    const lessonDate = new Date(start);
    lessonDate.setDate(start.getDate() + (r.day_of_week - 1));
    return {
      timetableEntryId: r.entry_id,
      classSubjectId: r.class_subject_id,
      templateId: r.template_id,
      templateVersion: r.template_version,
      dayOfWeek: r.day_of_week,
      date: isoDate(lessonDate),
      periodId: r.period_id,
      periodNumber: r.period_number,
      periodLabel: r.period_label,
      startTime: r.start_time.slice(0, 5),
      endTime: r.end_time.slice(0, 5),
      classId: r.class_id,
      className: r.class_name,
      classStream: r.class_stream ?? "",
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      level: normalizeLevel(r.level),
    };
  });

  const lessons = await enrichTeacherLessonsWithAttendance(baseLessons);

  return {
    weekStart: isoDate(start),
    weekEnd: isoDate(end),
    lessons,
    templatesUsed: templates.map((t) => ({
      id: t.id,
      level: normalizeLevel(t.level),
      termId: t.term_id,
      version: t.version,
    })),
  };
}

export async function getTeacherToday(teacherId: string): Promise<TeacherTodayView> {
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const week = await getTeacherWeek(teacherId, isoDate(mondayOfWeek(today)));
  const lessons = week.lessons.filter((l) => l.dayOfWeek === dayOfWeek);
  return {
    date: isoDate(today),
    dayOfWeek,
    lessons,
  };
}
