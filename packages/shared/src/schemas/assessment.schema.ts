import { z } from "zod";

export const cbcRatingSchema = z.enum(["A", "B", "C", "D"]);

export const cbcScoreUpsertSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  strandId: z.string().uuid(),
  termId: z.string().uuid(),
  competency: z.string().min(1),
  rating: cbcRatingSchema,
});

export const cbcScoresBulkSchema = z.object({
  items: z.array(cbcScoreUpsertSchema).min(1),
});

export const alevelScoreUpsertSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  score: z.coerce.number().min(0).max(100),
});

export const cbcReportGenerateSchema = z.object({
  classId: z.string().uuid(),
  termId: z.string().uuid(),
});

export const alevelReportGenerateSchema = z.object({
  classId: z.string().uuid(),
  termId: z.string().uuid(),
});

export const academicYearSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isActive: z.boolean().optional(),
});

export const updateAcademicYearSchema = academicYearSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const termSchema = z.object({
  academicYearId: z.string().uuid(),
  termNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isActive: z.boolean().optional(),
});

export const updateTermSchema = termSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const classSchema = z.object({
  name: z.string().min(1).max(10),
  stream: z.string().min(1).max(20),
  level: z
    .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
    .transform((v) => (v === "o_level" ? "O_LEVEL" : v === "a_level" ? "A_LEVEL" : v)),
  academicYearId: z.string().uuid(),
  classTeacherId: z.string().uuid().optional().nullable(),
});

export const updateClassSchema = classSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const subjectSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  level: z
    .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
    .transform((v) => (v === "o_level" ? "O_LEVEL" : v === "a_level" ? "A_LEVEL" : v)),
});

export const updateSubjectSchema = subjectSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: "At least one field is required",
});

export const classSubjectSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid().optional().nullable(),
  academicYearId: z.string().uuid(),
  termId: z.string().uuid().optional().nullable(),
});

export const combinationSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100),
  level: z
    .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
    .transform((v) => (v === "o_level" ? "O_LEVEL" : v === "a_level" ? "A_LEVEL" : v)),
  description: z.string().max(2000).optional().nullable(),
  subjects: z.array(z.string().uuid()).optional().default([]),
});

/** CBC strand definition (admin creates strands for subjects) */
export const cbcStrandSchema = z.object({
  subjectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(2000).optional().nullable(),
  competencies: z.array(z.string().min(1)).optional().default([]),
});

export const updateClassSubjectSchema = z
  .object({
    teacherId: z.string().uuid().nullable().optional(),
    termId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const classSubjectBulkSchema = z.object({
  classId: z.string().uuid(),
  subjectIds: z.array(z.string().uuid()).min(1),
  academicYearId: z.string().uuid(),
  termId: z.string().uuid().optional().nullable(),
});

/** Bulk assign one teacher (or unassign with null) to many class_subjects rows */
export const bulkAssignTeacherSchema = z.object({
  teacherId: z.union([z.string().uuid(), z.null()]),
  classSubjectIds: z.array(z.string().uuid()).min(1, "Select at least one class-subject row"),
});

/** Query: teacher assignments or unassigned list */
export const teacherAssignmentsQuerySchema = z.object({
  academicYearId: z.string().uuid(),
});

export type BulkAssignTeacherIn = z.infer<typeof bulkAssignTeacherSchema>;

export const updateCombinationSchema = z
  .object({
    code: z.string().min(1).max(20).optional(),
    name: z.string().min(1).max(100).optional(),
    level: z
      .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
      .transform((v) => (v === "o_level" ? "O_LEVEL" : v === "a_level" ? "A_LEVEL" : v))
      .optional(),
    description: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const combinationSubjectSchema = z.object({ subjectId: z.string().uuid() });

export const updateCbcStrandSchema = z
  .object({
    subjectId: z.string().uuid().optional(),
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(20).optional(),
    description: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const cbcSubStrandSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(2000).optional().nullable(),
});

export const updateCbcSubStrandSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(20).optional(),
    description: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export type CbcScoreUpsertInput = z.infer<typeof cbcScoreUpsertSchema>;
export type AlevelScoreUpsertInput = z.infer<typeof alevelScoreUpsertSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
export type UpdateTermInput = z.infer<typeof updateTermSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
