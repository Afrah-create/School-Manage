"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ClassEnrollmentSummary,
  PaginatedStudents,
  StudentBrowseQuery,
} from "@uganda-cbc-sms/shared";
import { apiGet } from "@/lib/api";

export type StudentsBrowseFilters = {
  page: number;
  limit: number;
  classId: string;
  status: StudentBrowseQuery["status"];
  q: string;
  sort: StudentBrowseQuery["sort"];
};

function toQuery(filters: StudentsBrowseFilters): string {
  const p = new URLSearchParams();
  p.set("page", String(filters.page));
  p.set("limit", String(filters.limit));
  p.set("status", filters.status);
  p.set("sort", filters.sort);
  if (filters.classId) p.set("classId", filters.classId);
  if (filters.q.trim()) p.set("q", filters.q.trim());
  return `?${p.toString()}`;
}

export function useClassEnrollmentSummary() {
  return useQuery({
    queryKey: ["students", "class-summary"],
    queryFn: () => apiGet<ClassEnrollmentSummary[]>("/students/class-summary"),
    staleTime: 60_000,
  });
}

export function useStudentsBrowse(filters: StudentsBrowseFilters, enabled = true) {
  return useQuery({
    queryKey: ["students", "browse", filters],
    queryFn: () => apiGet<PaginatedStudents>(`/students${toQuery(filters)}`),
    enabled,
    placeholderData: (prev) => prev,
  });
}
