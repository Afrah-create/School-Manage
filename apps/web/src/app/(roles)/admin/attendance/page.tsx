"use client";

import type { AcademicYear, SchoolClass } from "@uganda-cbc-sms/shared";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ReportsAnalyticsSkeleton } from "@/components/feedback/ReportsAnalyticsSkeleton";
import {
  AttendanceAdminCharts,
  AttendanceAdminKpis,
} from "@/components/attendance/AttendanceAdminCharts";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ACADEMIC_LEVELS, levelLabel, type AcademicLevel } from "@/lib/academicLevel";
import { apiGet } from "@/lib/api";
import {
  useAttendanceAdminOverview,
  type AttendanceAdminFilters,
} from "@/hooks/useAttendanceAdmin";
import { queryStatus } from "@/lib/queryStatus";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AdminAttendancePage() {
  const [filters, setFilters] = useState<AttendanceAdminFilters>({
    from: daysAgoIso(13),
    to: new Date().toISOString().slice(0, 10),
    academicYearId: "",
    classId: "",
    level: "",
  });

  const yearsQ = useQuery({
    queryKey: ["academic-years", "admin-attendance"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const classesQ = useQuery({
    queryKey: ["classes", "admin-attendance"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });

  const years = yearsQ.data ?? [];
  const allClasses = classesQ.data ?? [];

  useEffect(() => {
    if (!filters.academicYearId && years.length) {
      const active = years.find((y) => y.isActive) ?? years[0];
      if (active) setFilters((f) => ({ ...f, academicYearId: active.id }));
    }
  }, [years, filters.academicYearId]);

  const classes = useMemo(() => {
    return allClasses.filter((c) => {
      if (filters.academicYearId && c.academicYearId !== filters.academicYearId) return false;
      if (filters.level && c.level !== filters.level) return false;
      return true;
    });
  }, [allClasses, filters.academicYearId, filters.level]);

  const classOptions = useMemo(
    () => [
      { value: "", label: "All classes" },
      ...classes.map((c) => ({
        value: c.id,
        label: c.stream ? `${c.name} · ${c.stream}` : c.name,
      })),
    ],
    [classes],
  );

  const overviewQ = useAttendanceAdminOverview(filters);
  const status = queryStatus(overviewQ);
  const isFetching = overviewQ.isFetching && !overviewQ.isPending;

  const yearOptions = useMemo(
    () => years.map((y) => ({ value: y.id, label: y.name + (y.isActive ? " (active)" : "") })),
    [years],
  );

  const levelOptions = useMemo(
    () => [
      { value: "", label: "All levels" },
      ...ACADEMIC_LEVELS.map((l) => ({ value: l, label: levelLabel(l) })),
    ],
    [],
  );

  return (
    <PageWrapper
      title="Attendance tracking"
      description="School-wide attendance analytics, trends, and register compliance."
    >
      <Card title="Filters">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Academic year"
            options={yearOptions}
            value={filters.academicYearId}
            onChange={(e) =>
              setFilters((f) => ({ ...f, academicYearId: e.target.value, classId: "" }))
            }
          />
          <Select
            label="Level"
            options={levelOptions}
            value={filters.level}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                level: e.target.value as "" | AcademicLevel,
                classId: "",
              }))
            }
          />
          <Select
            label="Class"
            options={classOptions}
            value={filters.classId}
            onChange={(e) => setFilters((f) => ({ ...f, classId: e.target.value }))}
          />
          <Input
            label="From"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
          <Input
            label="To"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void overviewQ.refetch()}>
            Refresh
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                from: daysAgoIso(6),
                to: new Date().toISOString().slice(0, 10),
              }))
            }
          >
            Last 7 days
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                from: daysAgoIso(29),
                to: new Date().toISOString().slice(0, 10),
              }))
            }
          >
            Last 30 days
          </Button>
        </div>
      </Card>

      <AsyncContent
        status={status}
        isFetching={isFetching}
        loading={<ReportsAnalyticsSkeleton />}
        error={
          <ErrorState
            message={overviewQ.error instanceof Error ? overviewQ.error.message : "Failed to load attendance analytics"}
            onRetry={() => void overviewQ.refetch()}
          />
        }
        className="mt-4 space-y-4"
      >
        {overviewQ.data ? (
          <>
            <AttendanceAdminKpis kpis={overviewQ.data.kpis} />
            <AttendanceAdminCharts data={overviewQ.data} />
          </>
        ) : null}
      </AsyncContent>
    </PageWrapper>
  );
}
