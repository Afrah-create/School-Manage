"use client";

import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { KpiGrid } from "@/components/layout/shells/DashboardScaffold";
import { DivisionChart, ReadinessCharts } from "@/components/reports/charts/ReadinessCharts";
import { PerformanceCharts } from "@/components/reports/charts/PerformanceCharts";
import { ReportPipelineCharts } from "@/components/reports/charts/ReportPipelineCharts";
import { ReportCardPreview } from "@/components/reports/ReportCardPreview";
import { ReportsFilters, type ReportsFiltersValue } from "@/components/reports/ReportsFilters";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useReportsOverview } from "@/hooks/useReportsAnalytics";
import { apiGet, apiPost } from "@/lib/api";

const CONTEXT_KEY = "sms-admin-reports-context-v1";

type TabId = "pipeline" | "performance" | "readiness" | "actions";

export default function AdminReportsPage() {
  const [tab, setTab] = useState<TabId>("pipeline");
  const [filters, setFilters] = useState<ReportsFiltersValue>({
    yearId: "",
    termId: "",
    classId: "",
    track: "all",
  });
  const [reportId, setReportId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const yearsQ = useQuery({ queryKey: ["years"], queryFn: () => apiGet<AcademicYear[]>("/academic/years") });
  const termsQ = useQuery({ queryKey: ["terms"], queryFn: () => apiGet<Term[]>("/academic/terms") });
  const classesQ = useQuery({ queryKey: ["classes"], queryFn: () => apiGet<SchoolClass[]>("/academic/classes") });

  const overviewQ = useReportsOverview({
    classId: filters.classId,
    termId: filters.termId,
    yearId: filters.yearId,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTEXT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ReportsFiltersValue>;
      setFilters((f) => ({ ...f, ...parsed }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(filters));
  }, [filters]);

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

  const yearOpts = years.map((y) => ({ value: y.id, label: y.name }));
  const termOpts = terms.map((t) => ({
    value: t.id,
    label: `Term ${t.termNumber}${t.isActive ? " (active)" : ""}`,
  }));
  const classOpts = classes.map((c) => ({
    value: c.id,
    label: [c.name, c.stream].filter(Boolean).join(" ") || c.name,
  }));

  const data = overviewQ.data;
  const filtersReady = Boolean(filters.classId && filters.termId && filters.yearId);

  const kpis = useMemo(() => {
    if (!data) return [];
    const cbcAvg = Number(data.kpis.averageCbcNumeric ?? 0);
    const alAvg = Number(data.kpis.averageAlevelScore ?? 0);
    const { pipeline } = data;
    const cbcSubmitted = data.readiness.cbc.filter((r) => r.status === "Submitted").length;
    const cbcTotal = data.readiness.cbc.length;
    const subPct = cbcTotal ? Math.round((cbcSubmitted / cbcTotal) * 100) : 0;

    return [
      {
        label: "Active students (class)",
        value: String(pipeline.activeStudents),
        delta: "In selected class",
        deltaTone: "neutral" as const,
      },
      {
        label: "CBC reports approved",
        value: `${pipeline.cbc.approved}/${pipeline.cbc.generated || pipeline.activeStudents}`,
        delta: `${pipeline.cbc.pendingApproval} awaiting approval`,
        deltaTone: pipeline.cbc.pendingApproval > 0 ? ("negative" as const) : ("positive" as const),
      },
      {
        label: "School CBC average",
        value: cbcAvg > 0 ? cbcAvg.toFixed(2) : "—",
        delta: "Numeric scale (A=4…D=1)",
        deltaTone: "neutral" as const,
      },
      {
        label: "School A-Level average",
        value: alAvg > 0 ? alAvg.toFixed(1) : "—",
        delta: cbcTotal ? `${subPct}% CBC subjects submitted` : "Select class",
        deltaTone: subPct >= 80 ? ("positive" as const) : ("neutral" as const),
      },
    ];
  }, [data]);

  const genCbc = async () => {
    setErr(null);
    setMsg(null);
    try {
      const r = await apiPost<{ reportIds: string[] }>("/reports/cbc/generate", {
        classId: filters.classId,
        termId: filters.termId,
      });
      setMsg(`Generated ${r.reportIds.length} CBC reports`);
      await overviewQ.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  const genAl = async () => {
    setErr(null);
    setMsg(null);
    try {
      const r = await apiPost<{ reportIds: string[] }>("/reports/alevel/generate", {
        classId: filters.classId,
        termId: filters.termId,
      });
      setMsg(`Generated ${r.reportIds.length} A-Level reports`);
      await overviewQ.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  const showCbc = filters.track === "all" || filters.track === "cbc";
  const showAlevel = filters.track === "all" || filters.track === "alevel";

  const tabs: { id: TabId; label: string }[] = [
    { id: "pipeline", label: "Pipeline" },
    { id: "performance", label: "Performance" },
    { id: "readiness", label: "Readiness" },
    { id: "actions", label: "Generate & preview" },
  ];

  return (
    <PageWrapper
      title="Reports center"
      description="Analytics, report-card pipeline, and PDF generation for the selected class and term."
    >
      <ReportsFilters
        years={yearOpts}
        terms={termOpts}
        classes={classOpts}
        value={filters}
        onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
      />

      {!filtersReady ? (
        <div className="mt-4">
          <Alert tone="info">Select academic year, term, and class to load charts.</Alert>
        </div>
      ) : null}

      {overviewQ.isLoading && filtersReady ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading analytics…</p>
      ) : null}

      {overviewQ.isError ? (
        <div className="mt-4">
          <Alert tone="error">
            {overviewQ.error instanceof Error ? overviewQ.error.message : "Failed to load analytics"}
          </Alert>
        </div>
      ) : null}

      {data && filtersReady ? <KpiGrid metrics={kpis} /> : null}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-ui ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pipeline" && data && filtersReady ? (
        <div className="mt-4">
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
        </div>
      ) : null}

      {tab === "performance" && data && filtersReady ? (
        <div className="mt-4 space-y-4">
          {showCbc || showAlevel ? (
            <PerformanceCharts
              cbc={showCbc ? data.performance.cbc : []}
              alevel={showAlevel ? data.performance.alevel : []}
            />
          ) : null}
          {showAlevel ? <DivisionChart divisions={data.divisions} /> : null}
        </div>
      ) : null}

      {tab === "readiness" && data && filtersReady ? (
        <div className="mt-4">
          <ReadinessCharts
            cbc={showCbc ? data.readiness.cbc : []}
            alevel={showAlevel ? data.readiness.alevel : []}
          />
        </div>
      ) : null}

      {tab === "actions" ? (
        <div className="mt-4 space-y-6">
          <Card title="Generate report cards">
            <p className="mb-3 text-sm text-muted-foreground">
              Creates report records for all active students in the selected class. Headteacher approval is required
              before PDFs are final.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!filtersReady} onClick={() => void genCbc()}>
                Generate CBC
              </Button>
              <Button variant="secondary" disabled={!filtersReady} onClick={() => void genAl()}>
                Generate A-Level
              </Button>
            </div>
            {msg ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{msg}</p> : null}
            {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
          </Card>

          <Card title="Preview report PDF">
            <Input
              label="Report ID (UUID)"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
            />
            {reportId ? (
              <div className="mt-3">
                <ReportCardPreview reportId={reportId} />
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}
    </PageWrapper>
  );
}
