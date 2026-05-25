"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

export type ReportReadiness = {
  track: "cbc" | "alevel";
  classLevel: string;
  className: string;
  termNumber: number;
  activeStudents: number;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    status: string;
  }>;
  ready: boolean;
  pendingSubjectCodes: string[];
};

export type ClassReportRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  isApproved: boolean;
  computedAt: string | null;
  division?: string | null;
  totalPoints?: number | null;
};

export type GenerateReportsResult = {
  track: "cbc" | "alevel";
  reportIds: string[];
  count: number;
  warnings: string[];
  skipped: number;
};

export function useReportReadiness(classId: string | undefined, termId: string | undefined) {
  return useQuery({
    queryKey: ["reports-readiness", classId, termId],
    queryFn: () =>
      apiGet<ReportReadiness>(
        `/reports/readiness?classId=${encodeURIComponent(classId!)}&termId=${encodeURIComponent(termId!)}`,
      ),
    enabled: Boolean(classId && termId),
  });
}

export function useClassReports(classId: string | undefined, termId: string | undefined) {
  return useQuery({
    queryKey: ["reports-list", classId, termId],
    queryFn: () =>
      apiGet<{ track: "cbc" | "alevel"; reports: ClassReportRow[] }>(
        `/reports/list?classId=${encodeURIComponent(classId!)}&termId=${encodeURIComponent(termId!)}`,
      ),
    enabled: Boolean(classId && termId),
  });
}

export function useReportActions() {
  const qc = useQueryClient();
  const invalidate = async (classId?: string, termId?: string) => {
    await qc.invalidateQueries({ queryKey: ["reports-readiness"] });
    await qc.invalidateQueries({ queryKey: ["reports-list"] });
    await qc.invalidateQueries({ queryKey: ["reports-analytics"] });
    await qc.invalidateQueries({ queryKey: ["reports-overview"] });
    if (classId && termId) {
      await qc.invalidateQueries({ queryKey: ["reports-readiness", classId, termId] });
      await qc.invalidateQueries({ queryKey: ["reports-list", classId, termId] });
    }
  };

  const generate = useMutation({
    mutationFn: (body: { classId: string; termId: string }) =>
      apiPost<GenerateReportsResult>("/reports/generate", body),
    onSuccess: (_d, vars) => void invalidate(vars.classId, vars.termId),
  });

  const approve = useMutation({
    mutationFn: (reportId: string) => apiPatch<{ type: string }>(`/reports/${reportId}/approve`, {}),
    onSuccess: () => void invalidate(),
  });

  return { generate, approve, invalidate };
}
