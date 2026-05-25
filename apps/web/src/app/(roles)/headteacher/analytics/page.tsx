"use client";

import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { DivisionChart, ReadinessCharts } from "@/components/reports/charts/ReadinessCharts";
import { PerformanceCharts } from "@/components/reports/charts/PerformanceCharts";
import { ReportPipelineCharts } from "@/components/reports/charts/ReportPipelineCharts";
import { ReportsFilters, type ReportsFiltersValue } from "@/components/reports/ReportsFilters";
import { Alert } from "@/components/ui/Alert";
import { KpiGrid } from "@/components/layout/shells/DashboardScaffold";
import { useReportsOverview } from "@/hooks/useReportsAnalytics";
import { apiGet } from "@/lib/api";

export default function HeadteacherAnalyticsPage() {
  const [filters, setFilters] = useState<ReportsFiltersValue>({
    yearId: "",
    termId: "",
    classId: "",
    track: "all",
  });

  const yearsQ = useQuery({ queryKey: ["years"], queryFn: () => apiGet<AcademicYear[]>("/academic/years") });
  const termsQ = useQuery({ queryKey: ["terms"], queryFn: () => apiGet<Term[]>("/academic/terms") });
  const classesQ = useQuery({ queryKey: ["classes"], queryFn: () => apiGet<SchoolClass[]>("/academic/classes") });

  const overviewQ = useReportsOverview({
    classId: filters.classId,
    termId: filters.termId,
    yearId: filters.yearId,
  });

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
  const data = overviewQ.data;
  const showCbc = filters.track === "all" || filters.track === "cbc";
  const showAlevel = filters.track === "all" || filters.track === "alevel";

  const kpis = data
    ? [
        {
          label: "Class students",
          value: String(data.pipeline.activeStudents),
          delta: "Active enrolment",
          deltaTone: "neutral" as const,
        },
        {
          label: "CBC approved",
          value: `${data.pipeline.cbc.approved}/${data.pipeline.cbc.generated || data.pipeline.activeStudents}`,
          delta: `${data.pipeline.cbc.pendingApproval} pending`,
          deltaTone: data.pipeline.cbc.pendingApproval > 0 ? ("negative" as const) : ("positive" as const),
        },
        {
          label: "A-Level approved",
          value: `${data.pipeline.alevel.approved}/${data.pipeline.alevel.generated || data.pipeline.activeStudents}`,
          delta: `${data.pipeline.alevel.pendingApproval} pending`,
          deltaTone: data.pipeline.alevel.pendingApproval > 0 ? ("negative" as const) : ("positive" as const),
        },
        {
          label: "School A-Level avg",
          value: Number(data.kpis.averageAlevelScore) > 0 ? Number(data.kpis.averageAlevelScore).toFixed(1) : "—",
          delta: "All classes",
          deltaTone: "neutral" as const,
        },
      ]
    : [];

  return (
    <PageWrapper title="Analytics" description="Class performance, report pipeline, and assessment readiness">
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

      {!filtersReady ? (
        <div className="mt-4">
          <Alert tone="info">Select year, term, and class to load analytics.</Alert>
        </div>
      ) : null}

      {overviewQ.isError ? (
        <div className="mt-4">
          <Alert tone="error">
            {overviewQ.error instanceof Error ? overviewQ.error.message : "Failed to load"}
          </Alert>
        </div>
      ) : null}

      {data && filtersReady ? (
        <>
          <KpiGrid metrics={kpis} />
          <div className="mt-6 space-y-8">
            <section>
              <h2 className="mb-3 text-lg font-semibold">Report pipeline</h2>
              <ReportPipelineCharts
                pipeline={{
                  ...data.pipeline,
                  cbc: showCbc
                    ? data.pipeline.cbc
                    : { generated: 0, approved: 0, pendingApproval: 0, notGenerated: 0 },
                  alevel: showAlevel
                    ? data.pipeline.alevel
                    : { generated: 0, approved: 0, pendingApproval: 0, notGenerated: 0 },
                }}
              />
            </section>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Performance</h2>
              <PerformanceCharts
                cbc={showCbc ? data.performance.cbc : []}
                alevel={showAlevel ? data.performance.alevel : []}
              />
              {showAlevel ? <div className="mt-4"><DivisionChart divisions={data.divisions} /></div> : null}
            </section>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Assessment readiness</h2>
              <ReadinessCharts
                cbc={showCbc ? data.readiness.cbc : []}
                alevel={showAlevel ? data.readiness.alevel : []}
              />
            </section>
          </div>
        </>
      ) : null}
    </PageWrapper>
  );
}
