import { z } from "zod";

export const EXAM_STATUSES = ["draft", "open", "closed"] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const examPaperSchema = z.object({
  subjectId: z.string().uuid(),
  isCompulsory: z.boolean().default(true),
});

export const createExamSchema = z
  .object({
    name: z.string().min(2, "Exam name must be at least 2 characters").max(200),
    academicYearId: z.string().uuid("Please select a valid academic year"),
    termId: z.string().uuid("Please select a valid term"),
    classId: z.string().uuid("Please select a valid class"),
    examDate: z.string().optional(),
    maxScore: z.coerce.number().min(1, "Maximum score must be at least 1").max(1000).default(100),
    /** @deprecated Prefer `papers` — all listed subjects are treated as compulsory. */
    subjectIds: z.array(z.string().uuid()).min(1).optional(),
    papers: z.array(examPaperSchema).min(1, "Select at least one subject for this exam").optional(),
  })
  .refine((v) => (v.papers?.length ?? 0) > 0 || (v.subjectIds?.length ?? 0) > 0, {
    message: "Select at least one subject for this exam",
    path: ["papers"],
  });

export const updateExamSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    examDate: z.string().nullable().optional(),
    maxScore: z.coerce.number().min(1).max(1000).optional(),
    subjectIds: z.array(z.string().uuid()).min(1).optional(),
    papers: z.array(examPaperSchema).min(1).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "No changes were provided" });

export const examMarkItemSchema = z.object({
  studentId: z.string().uuid(),
  score: z.coerce.number().min(0),
});

export const examMarksBulkSchema = z.object({
  subjectId: z.string().uuid("Please select a subject"),
  marks: z.array(examMarkItemSchema).min(1, "Enter at least one mark to save"),
});

export const examMarksSubmitSchema = z.object({
  subjectId: z.string().uuid("Please select a subject"),
});

export const examEntryItemSchema = z.object({
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  isEntered: z.boolean(),
});

export const saveExamEntriesSchema = z.object({
  entries: z.array(examEntryItemSchema).min(1, "Provide at least one entry change"),
});

export const examEntriesPresetSchema = z.object({
  preset: z.enum(["compulsory_all_students", "all_papers_all_students"]),
});

/** Permanent removal — admin must type the exact exam name. */
export const permanentDeleteExamSchema = z.object({
  confirmName: z.string().min(1, "Type the exam name exactly as shown to confirm permanent deletion"),
});

export type ExamPaperInput = z.infer<typeof examPaperSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type ExamMarksBulkInput = z.infer<typeof examMarksBulkSchema>;
export type SaveExamEntriesInput = z.infer<typeof saveExamEntriesSchema>;
