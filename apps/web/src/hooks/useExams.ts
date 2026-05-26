"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateExamInput, ExamSummary, UpdateExamInput } from "@uganda-cbc-sms/shared";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const toQuery = (filters: Record<string, string | undefined>) => {
  const qp = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) qp.set(k, v);
  });
  const s = qp.toString();
  return s ? `?${s}` : "";
};

export type ExamDetail = ExamSummary & {
  subjects: Array<{
    id: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    isSubmitted: boolean;
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

export function useExam(id: string | undefined) {
  return useQuery({
    queryKey: ["exams", id],
    queryFn: () => apiGet<ExamDetail>(`/exams/${id}`),
    enabled: Boolean(id),
  });
}

export function useExamSubjects(examId: string | undefined) {
  return useQuery({
    queryKey: ["exams", examId, "subjects"],
    queryFn: () => apiGet<ExamTeacherSubject[]>(`/exams/${examId}/subjects`),
    enabled: Boolean(examId),
  });
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
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ deleted: boolean }>(`/exams/${id}`),
    onSuccess: () => void invalidate(),
  });
  const open = useMutation({
    mutationFn: (id: string) => apiPost<ExamDetail>(`/exams/${id}/open`),
    onSuccess: () => void invalidate(),
  });
  const close = useMutation({
    mutationFn: (id: string) => apiPost<ExamDetail>(`/exams/${id}/close`),
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

  return { create, update, remove, open, close, reopen, unlock, invalidate };
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
