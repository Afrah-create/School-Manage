"use client";

import { useQuery } from "@tanstack/react-query";
import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { apiGet } from "@/lib/api";

export type AssessmentAssignmentRow = {
  classId: string;
  className: string;
  classStream: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
};

type AssignedApiRow = {
  classId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
};

export function useAssessmentYears() {
  return useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
}

export function useAssessmentTerms(yearId: string | undefined) {
  return useQuery({
    queryKey: ["academic-terms", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId!)}`),
    enabled: Boolean(yearId),
  });
}

export function useAssessmentAssignments(
  yearId: string | undefined,
  termId?: string,
  track?: "cbc" | "alevel",
) {
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });

  const assignedQ = useQuery({
    queryKey: ["assessment-subjects-assigned", yearId, termId, track],
    queryFn: async () => {
      const qp = new URLSearchParams();
      if (yearId) qp.set("yearId", yearId);
      if (termId) qp.set("termId", termId);
      if (track) qp.set("track", track);
      const q = qp.toString();
      return apiGet<AssignedApiRow[]>(`/assessments/subjects-assigned${q ? `?${q}` : ""}`);
    },
    enabled: Boolean(yearId),
  });

  const classById = new Map((classesQ.data ?? []).map((c) => [c.id, c]));

  const rows: AssessmentAssignmentRow[] = (assignedQ.data ?? []).map((r) => {
    const cls = classById.get(r.classId);
    return {
      classId: r.classId,
      className: cls?.name ?? "Class",
      classStream: cls?.stream ?? null,
      subjectId: r.subjectId,
      subjectName: r.subjectName,
      subjectCode: r.subjectCode,
    };
  });

  return {
    rows,
    isLoading: assignedQ.isLoading || classesQ.isLoading,
    isError: assignedQ.isError || classesQ.isError,
    error: assignedQ.error ?? classesQ.error,
    refetch: async () => {
      await Promise.all([assignedQ.refetch(), classesQ.refetch()]);
    },
  };
}
