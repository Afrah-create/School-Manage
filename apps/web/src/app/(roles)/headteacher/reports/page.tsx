"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { ReportGeneratePanel } from "@/components/reports/ReportGeneratePanel";
import { ReportsFilters, type ReportsFiltersValue } from "@/components/reports/ReportsFilters";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { apiGet } from "@/lib/api";

export default function HeadteacherReportsPage() {
  const [filters, setFilters] = useState<ReportsFiltersValue>({
    yearId: "",
    termId: "",
    classId: "",
    track: "all",
  });

  const yearsQ = useQuery({ queryKey: ["years"], queryFn: () => apiGet<AcademicYear[]>("/academic/years") });
  const termsQ = useQuery({ queryKey: ["terms"], queryFn: () => apiGet<Term[]>("/academic/terms") });
  const classesQ = useQuery({ queryKey: ["classes"], queryFn: () => apiGet<SchoolClass[]>("/academic/classes") });

  const years = yearsQ.data ?? [];
  const terms = (termsQ.data ?? []).filter((t) => !filters.yearId || t.academicYearId === filters.yearId);
  const classes = (classesQ.data ?? []).filter((c) => !filters.yearId || c.academicYearId === filters.yearId);

  useEffect(() => {
    if (!filters.yearId && years.length) {
      const active = years.find((y) => y.isActive) ?? years[0];
      if (active) setFilters((f) => ({ ...f, yearId: active.id }));
    }
  }, [years, filters.yearId]);

  useEffect(() => {
    if (!filters.termId && terms.length) {
      const active = terms.find((t) => t.isActive) ?? terms[0];
      if (active) setFilters((f) => ({ ...f, termId: active.id }));
    }
  }, [terms, filters.termId]);

  useEffect(() => {
    if (!filters.classId && classes.length) {
      setFilters((f) => ({ ...f, classId: classes[0]!.id }));
    }
  }, [classes, filters.classId]);

  const filtersReady = Boolean(filters.classId && filters.termId && filters.yearId);

  return (
    <PageWrapper
      title="Report cards"
      description="Generate results from submitted assessments, preview PDFs, and approve final report cards."
    >
      <ReportsFilters
        years={years.map((y) => ({ value: y.id, label: y.name }))}
        terms={terms.map((t) => ({
          value: t.id,
          label: `Term ${t.termNumber}${t.isActive ? " (active)" : ""}`,
        }))}
        classes={classes.map((c) => ({
          value: c.id,
          label: [c.name, c.stream].filter(Boolean).join(" ") || c.name,
        }))}
        value={filters}
        onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
      />

      {filtersReady ? (
        <ReportGeneratePanel
          classId={filters.classId}
          termId={filters.termId}
          classes={classesQ.data ?? []}
        />
      ) : (
        <Alert tone="info">Select academic year, term, and class to manage report cards.</Alert>
      )}
    </PageWrapper>
  );
}
