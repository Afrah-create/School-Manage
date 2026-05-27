import { z } from "zod";

const timetableLevelSchema = z
  .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
  .transform((v) => (v === "o_level" || v === "O_LEVEL" ? "O_LEVEL" : "A_LEVEL"));

const timetableStatusSchema = z.enum(["draft", "published", "archived"]);

const timeStringSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export const timetableTemplateQuerySchema = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid(),
  level: timetableLevelSchema,
});

export const createTimetableTemplateSchema = timetableTemplateQuerySchema.extend({
  name: z.string().min(1).max(120).optional(),
});

export const cloneTimetableTemplateSchema = z.object({
  sourceTemplateId: z.string().uuid(),
  targetTemplateId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  termId: z.string().uuid().optional(),
  level: timetableLevelSchema.optional(),
  copyEntries: z.boolean().default(true),
});

export const timetablePeriodRowSchema = z.object({
  periodNumber: z.number().int().min(1),
  label: z.string().min(1).max(60),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  isTeaching: z.boolean().default(true),
});

export const timetablePeriodsBulkSchema = z.object({
  periods: z.array(timetablePeriodRowSchema).min(1).max(20),
});

export const timetableDayRowSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  isSchoolDay: z.boolean(),
});

export const timetableDaysBulkSchema = z.object({
  days: z.array(timetableDayRowSchema).min(1).max(7),
});

export const timetableEntryRowSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  periodId: z.string().uuid(),
  classSubjectId: z.string().uuid(),
});

export const timetableEntriesBulkSaveSchema = z.object({
  entries: z.array(timetableEntryRowSchema).max(500),
});

export const timetableGridQuerySchema = z.object({
  view: z.enum(["class", "teacher"]),
  classId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
});

export const timetableClassSubjectsQuerySchema = z.object({
  classId: z.string().uuid(),
});

export const timetableSlotOccupancyQuerySchema = z.object({
  excludeClassId: z.string().uuid().optional(),
});

export const timetablePublishSchema = z.object({
  acknowledgeWarnings: z.boolean().default(false),
});

export const timetableValidateIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  dayOfWeek: z.number().int().optional(),
  periodId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  classSubjectId: z.string().uuid().optional(),
});

export const timetableValidateResultSchema = z.object({
  errors: z.array(timetableValidateIssueSchema),
  warnings: z.array(timetableValidateIssueSchema),
  canPublish: z.boolean(),
});

export const timetableMyWeekQuerySchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const timetableBrowseQuerySchema = z.object({
  academicYearId: z.string().uuid().optional(),
  termId: z.string().uuid().optional(),
  level: timetableLevelSchema.optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
});

export const timetableOverviewParamsSchema = z.object({
  id: z.string().uuid(),
});

export type TimetableLevel = z.infer<typeof timetableLevelSchema>;
export type TimetableStatus = z.infer<typeof timetableStatusSchema>;
export type TimetableTemplateQuery = z.infer<typeof timetableTemplateQuerySchema>;
export type CreateTimetableTemplateInput = z.infer<typeof createTimetableTemplateSchema>;
export type CloneTimetableTemplateInput = z.infer<typeof cloneTimetableTemplateSchema>;
export type TimetablePeriodRowInput = z.infer<typeof timetablePeriodRowSchema>;
export type TimetablePeriodsBulkInput = z.infer<typeof timetablePeriodsBulkSchema>;
export type TimetableDaysBulkInput = z.infer<typeof timetableDaysBulkSchema>;
export type TimetableEntryRowInput = z.infer<typeof timetableEntryRowSchema>;
export type TimetableEntriesBulkSaveInput = z.infer<typeof timetableEntriesBulkSaveSchema>;
export type TimetableGridQuery = z.infer<typeof timetableGridQuerySchema>;
export type TimetablePublishInput = z.infer<typeof timetablePublishSchema>;
export type TimetableValidateResult = z.infer<typeof timetableValidateResultSchema>;
export type TimetableMyWeekQuery = z.infer<typeof timetableMyWeekQuerySchema>;
export type TimetableBrowseQuery = z.infer<typeof timetableBrowseQuerySchema>;

export type TimetableBrowseItem = TimetableTemplate & {
  academicYearName: string;
  termNumber: number;
  publishedByName: string | null;
  classCount: number;
  teacherCount: number;
  isActive: boolean;
};

export type TimetableTemplateOverview = {
  template: TimetableTemplate;
  academicYearName: string;
  termNumber: number;
  publishedByName: string | null;
  stats: {
    entryCount: number;
    classCount: number;
    teacherCount: number;
    teachingPeriodCount: number;
    schoolDayCount: number;
  };
  classes: Array<{
    classId: string;
    className: string;
    classStream: string;
    lessonCount: number;
  }>;
  teachers: Array<{
    teacherId: string;
    teacherName: string;
    lessonCount: number;
  }>;
};

export type TimetableTemplate = {
  id: string;
  academicYearId: string;
  termId: string;
  level: "O_LEVEL" | "A_LEVEL";
  name: string;
  status: TimetableStatus;
  version: number;
  publishedAt: string | null;
  publishedBy: string | null;
  periodCount: number;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TimetablePeriod = {
  id: string;
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isTeaching: boolean;
};

export type TimetableDay = {
  id: string;
  dayOfWeek: number;
  isSchoolDay: boolean;
};

export type TimetableGridCell = {
  dayOfWeek: number;
  periodId: string;
  entryId: string | null;
  classSubjectId: string | null;
  subjectId: string | null;
  subjectName: string | null;
  subjectCode: string | null;
  teacherId: string | null;
  teacherName: string | null;
  classId: string | null;
  className: string | null;
  classStream: string | null;
};

export type TimetableClassSubjectOption = {
  classSubjectId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
};

export type TimetableSlotOccupancyQuery = z.infer<typeof timetableSlotOccupancyQuerySchema>;

export type TimetableSlotOccupant = {
  classId: string;
  className: string;
  classStream: string;
  subjectCode: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  classSubjectId: string;
};

export type TimetableSlotOccupancyView = {
  bySlot: Record<string, TimetableSlotOccupant[]>;
};

export type TimetableGridView = {
  template: Pick<TimetableTemplate, "id" | "status" | "level" | "name" | "version">;
  periods: TimetablePeriod[];
  days: TimetableDay[];
  cells: TimetableGridCell[];
  classId?: string;
  teacherId?: string;
};

export type TimetablePublicationLogEntry = {
  id: string;
  templateId: string;
  version: number;
  publishedBy: string | null;
  publishedByName: string | null;
  publishedAt: string;
  entryCount: number;
  validationSummary: Record<string, unknown> | null;
};

export type TeacherWeekLesson = {
  timetableEntryId: string;
  classSubjectId: string;
  dayOfWeek: number;
  date: string;
  periodId: string;
  periodNumber: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  classId: string;
  className: string;
  classStream: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  level: string;
  templateId: string;
  templateVersion: number;
  attendanceRegisterId: string | null;
  attendanceStatus: "none" | "draft" | "submitted" | "locked";
  studentCount: number;
};

export type TeacherWeekView = {
  weekStart: string;
  weekEnd: string;
  lessons: TeacherWeekLesson[];
  templatesUsed: Array<{ id: string; level: string; termId: string; version: number }>;
};

export type TeacherTodayView = {
  date: string;
  dayOfWeek: number;
  lessons: TeacherWeekLesson[];
};
