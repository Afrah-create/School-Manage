"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "@/lib/api";

const toQuery = (filters: Record<string, string | undefined>) => {
  const qp = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) qp.set(k, v);
  });
  const s = qp.toString();
  return s ? `?${s}` : "";
};

export function useAlevelAssessments(filters: {
  classId?: string;
  subjectId?: string;
  combinationId?: string;
  termId?: string;
  yearId?: string;
}) {
  return useQuery({
    queryKey: ["alevel-assessments", filters],
    queryFn: () => apiGet<unknown[]>(`/assessments/alevel${toQuery(filters)}`),
    enabled: Boolean(filters.classId && filters.subjectId && filters.termId && filters.yearId),
  });
}

export function useAlevelDivision(filters: {
  classId?: string;
  combinationId?: string;
  termId?: string;
  yearId?: string;
}) {
  return useQuery({
    queryKey: ["alevel-division", filters],
    queryFn: () => apiGet<unknown[]>(`/assessments/alevel/division${toQuery(filters)}`),
    enabled: Boolean(filters.classId && filters.termId && filters.yearId),
  });
}

export function useAlevelComments(filters: { classId?: string; termId?: string; yearId?: string }) {
  return useQuery({
    queryKey: ["alevel-comments", filters],
    queryFn: () => apiGet<unknown[]>(`/assessments/alevel/comments${toQuery(filters)}`),
    enabled: Boolean(filters.classId && filters.termId && filters.yearId),
  });
}

export function useAlevelStatus(filters: { classId?: string; termId?: string; yearId?: string }) {
  return useQuery({
    queryKey: ["alevel-status", filters],
    queryFn: () => apiGet<unknown[]>(`/assessments/alevel/status${toQuery(filters)}`),
    enabled: Boolean(filters.classId && filters.termId && filters.yearId),
  });
}

export function useAlevelActions() {
  const qc = useQueryClient();
  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["alevel-assessments"] }),
      qc.invalidateQueries({ queryKey: ["alevel-division"] }),
      qc.invalidateQueries({ queryKey: ["alevel-comments"] }),
      qc.invalidateQueries({ queryKey: ["alevel-status"] }),
    ]);
  };

  const saveBulk = useMutation({
    mutationFn: (payload: unknown) => apiPost("/assessments/alevel/bulk", payload),
    onSuccess: () => void invalidate(),
  });
  const submit = useMutation({
    mutationFn: (payload: unknown) => apiPost("/assessments/alevel/submit", payload),
    onSuccess: () => void invalidate(),
  });
  const updateComment = useMutation({
    mutationFn: ({ studentId, payload }: { studentId: string; payload: unknown }) =>
      apiPut(`/assessments/alevel/comments/${studentId}`, payload),
    onSuccess: () => void invalidate(),
  });
  return { saveBulk, submit, updateComment };
}
