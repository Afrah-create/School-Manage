import { z } from "zod";
import { curriculumTrackSchema } from "./curriculum.schema";

/** UNEB O-Level achievement letter (A–E). Same vocabulary as assessments_cbc.rating / CBC_RATING_BANDS. */
export const letterGradeSchema = z.enum(["A", "B", "C", "D", "E"]);

/** @deprecated Prefer letterGradeSchema — alias for O-Level A–E letter grades. */
export const cbcRatingSchema = letterGradeSchema;

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
  /** When set, A-Level scores come from this exam; CBC reports add a formal exam results section. */
  examId: z.string().uuid().optional(),
});

/** Set the official exam used for report generation for a class/term. */
export const termReportDefaultSchema = z.object({
  classId: z.string().uuid(),
  termId: z.string().uuid(),
  examId: z.union([z.string().uuid(), z.null()]),
});

export const academicYearSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isActive: z.boolean().optional(),
  curriculumForm: z.enum(["S1", "S2", "S3", "S4"]).nullable().optional(),
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
  curriculumTrack: z.preprocess(
    (value) => (value === "" ? null : value),
    curriculumTrackSchema.nullable().optional(),
  ),
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

export const updateClassSubjectSchema = z
  .object({
    teacherId: z.string().uuid().nullable().optional(),
    termId: z.string().uuid().nullable().optional(),
    includeOnReports: z.boolean().optional(),
    projectWorkRequired: z.boolean().optional(),
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

const academicLevelQuerySchema = z
  .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
  .transform((v) => (v === "o_level" ? "O_LEVEL" : v === "a_level" ? "A_LEVEL" : v))
  .optional();

/** Query: teacher assignments or unassigned list */
export const teacherAssignmentsQuerySchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  level: academicLevelQuerySchema,
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
  level: academicLevelQuerySchema,
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

export const gradingScaleLevelSchema = z
  .enum(["o_level", "a_level", "O_LEVEL", "A_LEVEL"])
  .transform((v) => (v === "o_level" ? "O_LEVEL" : v === "a_level" ? "A_LEVEL" : v));

export const gradingScaleRowSchema = z
  .object({
    grade: z.string().min(1).max(10),
    minScore: z.coerce.number().min(0).max(100),
    maxScore: z.coerce.number().min(0).max(100),
    points: z.coerce.number().int().min(0).max(100).nullable().optional(),
    descriptor: z.string().max(255).optional().nullable(),
    sortOrder: z.coerce.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.minScore <= v.maxScore, { message: "minScore must be less than or equal to maxScore" });

export const upsertGradingScaleSchema = z.object({
  level: gradingScaleLevelSchema,
  rows: z.array(gradingScaleRowSchema).min(1),
});

export type AlevelScoreUpsertInput = z.infer<typeof alevelScoreUpsertSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
export type UpdateTermInput = z.infer<typeof updateTermSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export const assessmentFilterSchema = z.object({
  classId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  termId: z.string().uuid().optional(),
  yearId: z.string().uuid().optional(),
  combinationId: z.string().uuid().optional(),
});

export const submitAssessmentSchema = z
  .object({
    subjectId: z.string().uuid(),
    classId: z.string().uuid(),
    termId: z.string().uuid(),
    yearId: z.string().uuid(),
  })
  .strict();

export const cbcCommentUpdateSchema = z.object({
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
  classTeacherComment: z.string().max(5000).optional(),
  headteacherComment: z.string().max(5000).optional(),
});

export const alevelAssessmentUpsertSchema = z
  .object({
    studentId: z.string().uuid(),
    subjectId: z.string().uuid(),
    score: z.coerce.number().min(0).max(100),
    termId: z.string().uuid(),
    yearId: z.string().uuid(),
  })
  .strict();

export const alevelAssessmentBulkSchema = z
  .object({
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
})
  .strict();

export const alevelCommentUpdateSchema = z.object({
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
  classTeacherComment: z.string().max(5000).optional(),
  headteacherRemark: z.string().max(5000).optional(),
});

const curriculumFormSchema = z.enum(["S1", "S2", "S3", "S4"]);

export const assessmentConfigSchema = z.object({
  caWeight: z.coerce.number().min(0).max(1).optional(),
  eocWeight: z.coerce.number().min(0).max(1).optional(),
  includeProjectWorkInTermGrade: z.boolean().optional(),
  examsIncluded: z.enum(["compulsory_only", "all_with_marks"]).optional(),
  allowIncompleteCaOverride: z.boolean().optional(),
  policyVerifiedAt: z.string().datetime().nullable().optional(),
  projectWork: z
    .object({
      expectedPerTerm: z.coerce.number().int().min(1).max(20).optional(),
      policyVerifiedAt: z.string().datetime().nullable().optional(),
    })
    .optional(),
  caRules: z
    .object({
      aggregation: z.enum(["mean_of_projects", "mean_of_term_means"]).optional(),
    })
    .optional(),
});

export const projectWorkScoreSchema = z.object({
  studentId: z.string().uuid(),
  classSubjectId: z.string().uuid(),
  termId: z.string().uuid(),
  projectNumber: z.coerce.number().int().min(1).max(20),
  score: z.coerce.number().min(0),
  maxScore: z.coerce.number().min(1).default(100),
  evidenceRef: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const projectWorkBulkSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  yearId: z.string().uuid(),
  scores: z.array(
    z.object({
      studentId: z.string().uuid(),
      projectNumber: z.coerce.number().int().min(1).max(20),
      score: z.coerce.number().min(0).nullable(),
      maxScore: z.coerce.number().min(1).optional(),
    }),
  ),
});

export const gradingConfigSchema = z.object({
  oLevel: z.object({ scheme: z.string().min(1) }).optional(),
  aLevel: z.object({ scheme: z.string().min(1) }).optional(),
});

export type AssessmentConfigInput = z.infer<typeof assessmentConfigSchema>;
export type GradingConfigInput = z.infer<typeof gradingConfigSchema>;
