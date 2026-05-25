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

/** Class-driven report generation (template chosen from class level). */
export const reportGenerateSchema = z.object({
  classId: z.string().uuid("Please select a class"),
  termId: z.string().uuid("Please select a term"),
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
  classId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
});

/** Query: teachers eligible to teach given subject(s) in a class context */
export const eligibleTeachersQuerySchema = z.object({
  subjectIds: z
    .union([z.string().uuid(), z.array(z.string().uuid()).min(1)])
    .transform((v) => (Array.isArray(v) ? v : [v])),
  classId: z.string().uuid().optional(),
});

export const teacherSpecializationsSchema = z.object({
  subjectIds: z.array(z.string().uuid()),
});

export const classTeacherAssignmentsQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
});

export const setClassTeacherAssignmentsSchema = z.object({
  academicYearId: z.string().uuid(),
  teachers: z
    .array(
      z.object({
        teacherId: z.string().uuid(),
        isHomeroom: z.boolean().optional().default(false),
      }),
    )
    .default([]),
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

export const gradingScaleLevelSchema = z
  .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
  .transform((v) => (v === "o_level" ? "O_LEVEL" : v === "a_level" ? "A_LEVEL" : v));

export const gradingScaleRowSchema = z
  .object({
    grade: z.string().min(1).max(10),
    minScore: z.coerce.number().min(0).max(100),
    maxScore: z.coerce.number().min(0).max(100),
    points: z.coerce.number().int().min(0).max(100),
    descriptor: z.string().max(255).optional().nullable(),
    sortOrder: z.coerce.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.minScore <= v.maxScore, { message: "minScore must be less than or equal to maxScore" });

export const upsertGradingScaleSchema = z.object({
  level: gradingScaleLevelSchema,
  rows: z.array(gradingScaleRowSchema).min(1),
});

export type CbcScoreUpsertInput = z.infer<typeof cbcScoreUpsertSchema>;
export type AlevelScoreUpsertInput = z.infer<typeof alevelScoreUpsertSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
export type UpdateTermInput = z.infer<typeof updateTermSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export const assessmentFilterSchema = z.object({
  classId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  strandId: z.string().uuid().optional(),
  termId: z.string().uuid().optional(),
  yearId: z.string().uuid().optional(),
  combinationId: z.string().uuid().optional(),
});

export const submitAssessmentSchema = z.object({
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

export const cbcAssessmentUpsertSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  strand: z.string().min(1).max(255),
  competency: z.string().min(1).max(255),
  rating: cbcRatingSchema,
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

export const cbcAssessmentBulkSchema = z.object({
  assessments: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        subjectId: z.string().uuid(),
        strand: z.string().min(1).max(255),
        competency: z.string().min(1).max(255),
        rating: cbcRatingSchema,
      }),
    )
    .min(1),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

export const cbcProjectAssessmentSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  assessmentTitle: z.string().min(1).max(255),
  score: z.number().min(0).max(999.99).nullable().optional(),
  maxScore: z.number().min(1).max(999.99).nullable().optional(),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

export const cbcCommentUpdateSchema = z.object({
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
  classTeacherComment: z.string().max(5000).optional(),
  headteacherComment: z.string().max(5000).optional(),
});

export const alevelAssessmentUpsertSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  score: z.coerce.number().min(0).max(100),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

export const alevelAssessmentBulkSchema = z.object({
  assessments: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        subjectId: z.string().uuid(),
        score: z.coerce.number().min(0).max(100),
      }),
    )
    .min(1),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
});

export const alevelCommentUpdateSchema = z.object({
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
  classTeacherComment: z.string().max(5000).optional(),
  headteacherRemark: z.string().max(5000).optional(),
});
