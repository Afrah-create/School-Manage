"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateExamInput,
  ExamDeletionImpact,
  ExamEntriesMatrix,
  ExamMarkingProgress,
  ExamSummary,
  SaveExamEntriesInput,
  UpdateExamInput,
} from "@uganda-cbc-sms/shared";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";

const toQuery = (filters: Record<string, string | boolean | undefined>) => {
  const qp = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === true) qp.set(k, "true");
    else if (typeof v === "string" && v) qp.set(k, v);
  });
  const s = qp.toString();
  return s ? `?${s}` : "";
};

export type ExamDetail = ExamSummary & {
  markingProgress: ExamMarkingProgress;
  subjects: Array<{
    id: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    isCompulsory: boolean;
    isSubmitted: boolean;
    entrantsCount?: number;
  }>;
};

export type ExamTeacherSubject = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isSubmitted: boolean;
  canEdit: boolean;
};

export type ExamMarksPayload = {
  exam: ExamSummary;
  maxScore: number;
  subjectSubmitted: boolean;
  entrantsCount: number;
  students: Array<{
    id: string;
    fullName: string;
    studentNumber: string;
    score: number | null;
    grade: string | null;
    points: number | null;
    isLocked: boolean;
  }>;
};

export function useExamsList(filters: {
  academicYearId?: string;
  termId?: string;
  classId?: string;
  status?: string;
  archivedOnly?: boolean;
}) {
  return useQuery({
    queryKey: ["exams", filters],
    queryFn: () => apiGet<ExamSummary[]>(`/exams${toQuery(filters)}`),
  });
}

export type ExamMarkingSlot = {
  examId: string;
  examName: string;
  examDate: string | null;
  maxScore: number;
  classId: string;
  className: string;
  classStream: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isSubmitted: boolean;
  canEdit: boolean;
};

export function useExamMarkingSlots() {
  return useQuery({
    queryKey: ["exams", "marking-slots"],
    queryFn: () => apiGet<ExamMarkingSlot[]>("/exams/marking-slots"),
  });
}

export function useOpenExams() {
  return useQuery({
    queryKey: ["exams", "open"],
    queryFn: () => apiGet<ExamSummary[]>("/exams/open"),
  });
}

export function useExam(id: string | undefined, options?: { includeArchived?: boolean }) {
  return useQuery({
    queryKey: ["exams", id, options?.includeArchived ? "archived" : "active"],
    queryFn: () =>
      apiGet<ExamDetail>(
        `/exams/${id}${options?.includeArchived ? "?includeArchived=true" : ""}`,
      ),
    enabled: Boolean(id),
  });
}

export function useExamDeletionImpact(examId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["exams", examId, "deletion-impact"],
    queryFn: () => apiGet<ExamDeletionImpact>(`/exams/${examId}/deletion-impact`),
    enabled: Boolean(examId) && enabled,
  });
}

export function useExamSubjects(examId: string | undefined) {
  return useQuery({
    queryKey: ["exams", examId, "subjects"],
    queryFn: () => apiGet<ExamTeacherSubject[]>(`/exams/${examId}/subjects`),
    enabled: Boolean(examId),
  });
}

export function useExamEntriesMatrix(examId: string | undefined) {
  return useQuery({
    queryKey: ["exams", examId, "entries"],
    queryFn: () => apiGet<ExamEntriesMatrix>(`/exams/${examId}/entries`),
    enabled: Boolean(examId),
  });
}

export function useExamEntriesActions(examId: string) {
  const qc = useQueryClient();
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["exams", examId] });
    await qc.invalidateQueries({ queryKey: ["exams", examId, "entries"] });
    await qc.invalidateQueries({ queryKey: ["reports-readiness"] });
  };

  const save = useMutation({
    mutationFn: (body: SaveExamEntriesInput) =>
      apiPut<{ changed: number }>(`/exams/${examId}/entries`, body),
    onSuccess: () => void invalidate(),
  });
  const applyPreset = useMutation({
    mutationFn: (preset: "compulsory_all_students" | "all_papers_all_students") =>
      apiPost<{ applied: string }>(`/exams/${examId}/entries/preset`, { preset }),
    onSuccess: () => void invalidate(),
  });

  return { save, applyPreset };
}

export function useExamMarks(examId: string | undefined, subjectId: string | undefined) {
  return useQuery({
    queryKey: ["exams", examId, "marks", subjectId],
    queryFn: () =>
      apiGet<ExamMarksPayload>(`/exams/${examId}/marks${toQuery({ subjectId })}`),
    enabled: Boolean(examId && subjectId),
  });
}

export function useExamAdminActions() {
  const qc = useQueryClient();
  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["exams"] });
    await qc.invalidateQueries({ queryKey: ["reports-exam-options"] });
    await qc.invalidateQueries({ queryKey: ["reports-readiness"] });
    await qc.invalidateQueries({ queryKey: ["reports-list"] });
    await qc.invalidateQueries({ queryKey: ["reports-term-default"] });
  };

  const create = useMutation({
    mutationFn: (body: CreateExamInput) => apiPost<ExamDetail>("/exams", body),
    onSuccess: () => void invalidate(),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateExamInput }) =>
      apiPatch<ExamDetail>(`/exams/${id}`, body),
    onSuccess: () => void invalidate(),
  });
  const archive = useMutation({
    mutationFn: (id: string) => apiDelete<{ archived: boolean }>(`/exams/${id}`),
    onSuccess: () => void invalidate(),
  });
  const restore = useMutation({
    mutationFn: (id: string) => apiPost<ExamDetail>(`/exams/${id}/restore`),
    onSuccess: () => void invalidate(),
  });
  const permanentDelete = useMutation({
    mutationFn: ({ id, confirmName }: { id: string; confirmName: string }) =>
      apiDelete<{ deleted: boolean; marksRemoved: number; linkedReportsUnchanged: number }>(
        `/exams/${id}/permanent`,
        { confirmName },
      ),
    onSuccess: () => void invalidate(),
  });
  const open = useMutation({
    mutationFn: (id: string) => apiPost<ExamDetail>(`/exams/${id}/open`),
    onSuccess: () => void invalidate(),
  });
  const close = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      apiPost<ExamDetail>(`/exams/${id}/close${force ? "?force=true" : ""}`),
    onSuccess: () => void invalidate(),
  });
  const reopen = useMutation({
    mutationFn: (id: string) => apiPost<ExamDetail>(`/exams/${id}/reopen`),
    onSuccess: () => void invalidate(),
  });
  const unlock = useMutation({
    mutationFn: ({ examId, subjectId }: { examId: string; subjectId: string }) =>
      apiPatch<{ unlocked: boolean }>(`/exams/${examId}/marks/unlock`, { subjectId }),
    onSuccess: () => void invalidate(),
  });

  return { create, update, archive, restore, permanentDelete, open, close, reopen, unlock, invalidate };
}

export function useExamMarkActions(examId: string) {
  const qc = useQueryClient();
  const invalidate = async (subjectId?: string) => {
    await qc.invalidateQueries({ queryKey: ["exams", examId] });
    if (subjectId) {
      await qc.invalidateQueries({ queryKey: ["exams", examId, "marks", subjectId] });
    }
  };

  const saveBulk = useMutation({
    mutationFn: (body: { subjectId: string; marks: Array<{ studentId: string; score: number }> }) =>
      apiPost<{ saved: number; maxScore: number }>(`/exams/${examId}/marks/bulk`, body),
    onSuccess: (_d, vars) => void invalidate(vars.subjectId),
  });
  const submit = useMutation({
    mutationFn: (subjectId: string) =>
      apiPost<{ submitted: boolean }>(`/exams/${examId}/marks/submit`, { subjectId }),
    onSuccess: (_d, subjectId) => void invalidate(subjectId),
  });

  return { saveBulk, submit };
}
