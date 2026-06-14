import { z } from "zod";

export const genderSchema = z.enum(["male", "female"]);

export const studentStatusSchema = z.enum(["active", "transferred", "withdrawn"]);

const optionalEnrollmentText = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined ? null : v));

const optionalGuardianEmail = z
  .string()
  .max(255)
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined ? null : v));

const optionalUuidSelect = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v === undefined ? null : v));

export const createStudentSchema = z.object({
  fullName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: genderSchema,
  guardianName: z.string().min(1),
  guardianContact: z.string().min(5).max(20),
  classId: z.string().uuid(),
  combinationId: optionalUuidSelect,
  guardianEmail: optionalGuardianEmail,
  address: optionalEnrollmentText,
  previousSchool: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export const updateStudentSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: genderSchema.optional(),
    guardianName: z.string().min(1).optional(),
    guardianContact: z.string().min(5).max(20).optional(),
    classId: optionalUuidSelect,
    combinationId: optionalUuidSelect,
    status: studentStatusSchema.optional(),
    transferReason: z
      .string()
      .max(2000)
      .optional()
      .nullable()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    guardianEmail: optionalGuardianEmail,
    address: optionalEnrollmentText,
    previousSchool: z
      .string()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v === "" || v === undefined ? null : v)),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export const promoteStudentsSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1),
  targetClassId: z.string().uuid(),
});

export const withdrawStudentSchema = z.object({
  reason: z.string().min(1),
});

export const attendanceSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["present", "absent", "late"]),
});

export const attendanceStatusSchema = z.enum(["present", "absent", "late"]);

export const attendanceRegisterQuerySchema = z.object({
  classId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const attendanceRegisterRowSchema = z.object({
  studentId: z.string().uuid(),
  status: attendanceStatusSchema,
});

export const attendanceRegisterSaveSchema = z.object({
  classId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(attendanceRegisterRowSchema).min(1),
});

export const attendanceRegisterSubmitSchema = attendanceRegisterQuerySchema;

export const attendanceLessonRegisterQuerySchema = z.object({
  timetableEntryId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const attendanceLessonRegisterSaveSchema = z.object({
  timetableEntryId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(attendanceRegisterRowSchema).min(1),
});

export const attendanceLessonRegisterSubmitSchema = attendanceLessonRegisterQuerySchema;

export const attendanceRangeQuerySchema = z.object({
  classId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const optionalUuidFilter = z
  .string()
  .uuid()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const attendanceAdminOverviewQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    academicYearId: optionalUuidFilter,
    classId: optionalUuidFilter,
    level: z
      .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
      .optional()
      .transform((v) => {
        if (!v) return undefined;
        return v === "o_level" || v === "O_LEVEL" ? "O_LEVEL" : "A_LEVEL";
      }),
  })
  .refine((q) => q.from <= q.to, { message: "from must be on or before to" });

export const STUDENT_BROWSE_STATUSES = ["active", "transferred", "withdrawn", "all"] as const;

export const studentBrowseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
  /** Class UUID, or `unassigned` for learners without a class. */
  classId: z
    .string()
    .max(40)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  status: z.enum(STUDENT_BROWSE_STATUSES).default("active"),
  q: z.string().max(100).optional(),
  sort: z.enum(["name", "number"]).default("name"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type PromoteStudentsInput = z.infer<typeof promoteStudentsSchema>;
export type WithdrawStudentInput = z.infer<typeof withdrawStudentSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type AttendanceRegisterQuery = z.infer<typeof attendanceRegisterQuerySchema>;
export type AttendanceRegisterRowInput = z.infer<typeof attendanceRegisterRowSchema>;
export type AttendanceRegisterSaveInput = z.infer<typeof attendanceRegisterSaveSchema>;
export type AttendanceRegisterSubmitInput = z.infer<typeof attendanceRegisterSubmitSchema>;
export type AttendanceLessonRegisterQuery = z.infer<typeof attendanceLessonRegisterQuerySchema>;
export type AttendanceLessonRegisterSaveInput = z.infer<typeof attendanceLessonRegisterSaveSchema>;
export type AttendanceLessonRegisterSubmitInput = z.infer<typeof attendanceLessonRegisterSubmitSchema>;
export type AttendanceRangeQuery = z.infer<typeof attendanceRangeQuerySchema>;
export type AttendanceAdminOverviewQuery = z.infer<typeof attendanceAdminOverviewQuerySchema>;
export type StudentBrowseQuery = z.infer<typeof studentBrowseQuerySchema>;

export const STUDENT_IMPORT_CSV_HEADERS = [
  "fullName",
  "dateOfBirth",
  "gender",
  "className",
  "classStream",
  "guardianName",
  "guardianContact",
  "guardianEmail",
  "address",
  "previousSchool",
] as const;

export type StudentImportRowError = {
  row: number;
  field: string;
  message: string;
};

export type StudentImportResult = {
  created: number;
  skipped: number;
  totalRows: number;
  errors: StudentImportRowError[];
  createdStudentIds: string[];
};
