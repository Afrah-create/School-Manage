"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";

type CbcFilters = {
  classId?: string;
  subjectId?: string;
  strandId?: string;
  termId?: string;
  yearId?: string;
};

const toQuery = (filters: Record<string, string | undefined>) => {
  const qp = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) qp.set(k, v);
  });
  const s = qp.toString();
  return s ? `?${s}` : "";
};

export function useCbcAssessments(filters: CbcFilters) {
  return useQuery({
    queryKey: ["cbc-assessments", filters],
    queryFn: () => apiGet<unknown[]>(`/assessments/cbc${toQuery(filters)}`),
    enabled: Boolean(filters.termId && filters.yearId && filters.classId && filters.subjectId),
  });
}

export function useCbcProjects(filters: CbcFilters) {
  return useQuery({
    queryKey: ["cbc-projects", filters],
    queryFn: () => apiGet<unknown[]>(`/assessments/cbc/project${toQuery(filters)}`),
    enabled: Boolean(filters.termId && filters.yearId && filters.classId && filters.subjectId),
  });
}

export function useCbcComments(filters: { classId?: string; termId?: string; yearId?: string }) {
  return useQuery({
    queryKey: ["cbc-comments", filters],
    queryFn: () => apiGet<unknown[]>(`/assessments/cbc/comments${toQuery(filters)}`),
    enabled: Boolean(filters.classId && filters.termId && filters.yearId),
  });
}

export function useCbcStatus(filters: { classId?: string; termId?: string; yearId?: string }) {
  return useQuery({
    queryKey: ["cbc-status", filters],
    queryFn: () => apiGet<unknown[]>(`/assessments/cbc/status${toQuery(filters)}`),
    enabled: Boolean(filters.classId && filters.termId && filters.yearId),
  });
}

export function useCbcActions() {
  const qc = useQueryClient();
  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["cbc-assessments"] }),
      qc.invalidateQueries({ queryKey: ["cbc-projects"] }),
      qc.invalidateQueries({ queryKey: ["cbc-comments"] }),
      qc.invalidateQueries({ queryKey: ["cbc-status"] }),
    ]);
  };

  const saveBulk = useMutation({
    mutationFn: (payload: unknown) => apiPost("/assessments/cbc/bulk", payload),
    onSuccess: () => void invalidate(),
  });
  const submit = useMutation({
    mutationFn: (payload: unknown) => apiPost("/assessments/cbc/submit", payload),
    onSuccess: () => void invalidate(),
  });
  const unlock = useMutation({
    mutationFn: (payload: unknown) => apiPatch("/assessments/cbc/unlock", payload),
    onSuccess: () => void invalidate(),
  });
  const createProject = useMutation({
    mutationFn: (payload: unknown) => apiPost("/assessments/cbc/project", payload),
    onSuccess: () => void invalidate(),
  });
  const updateProject = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => apiPut(`/assessments/cbc/project/${id}`, payload),
    onSuccess: () => void invalidate(),
  });
  const updateComment = useMutation({
    mutationFn: ({ studentId, payload }: { studentId: string; payload: unknown }) =>
      apiPut(`/assessments/cbc/comments/${studentId}`, payload),
    onSuccess: () => void invalidate(),
  });

  return { saveBulk, submit, unlock, createProject, updateProject, updateComment };
}
