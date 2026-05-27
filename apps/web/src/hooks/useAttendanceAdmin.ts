"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { AcademicLevel } from "@/lib/academicLevel";

export type AttendanceAdminOverview = {
  kpis: {
    activeStudents: number;
    classCount: number;
    schoolDays: number;
    avgAttendanceRate: number;
    present: number;
    absent: number;
    late: number;
    registersSubmitted: number;
    registersDraft: number;
    registersMissing: number;
  };
  trend: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
    unmarked: number;
    attendanceRate: number;
  }>;
  byClass: Array<{
    classId: string;
    className: string;
    classStream: string;
    level: AcademicLevel | string;
    activeStudents: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
    registersSubmitted: number;
    registerDaysExpected: number;
  }>;
  statusBreakdown: { present: number; absent: number; late: number };
  registerCompliance: { submitted: number; draft: number; missing: number };
};

export type AttendanceAdminFilters = {
  from: string;
  to: string;
  academicYearId: string;
  classId: string;
  level: "" | AcademicLevel;
};

export function useAttendanceAdminOverview(filters: AttendanceAdminFilters) {
  const qp = new URLSearchParams({
    from: filters.from,
    to: filters.to,
  });
  if (filters.academicYearId) qp.set("academicYearId", filters.academicYearId);
  if (filters.classId) qp.set("classId", filters.classId);
  if (filters.level) qp.set("level", filters.level);

  return useQuery({
    queryKey: ["attendance-admin-overview", filters],
    queryFn: () => apiGet<AttendanceAdminOverview>(`/attendance/admin/overview?${qp.toString()}`),
    enabled: Boolean(filters.from && filters.to),
    placeholderData: keepPreviousData,
  });
}
