"use client";

import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { apiGet } from "@/lib/api";
import { levelLabel, parseAcademicLevel } from "@/lib/academicLevel";
import { combineQueryStatus } from "@/lib/queryStatus";

type SubjectRow = { id: string; name?: string; code?: string };

export default function HeadteacherAcademicPage() {
  const [yearId, setYearId] = useState("");

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["academic-terms", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
    enabled: Boolean(yearId),
  });
  const classesQ = useQuery({
    queryKey: ["academic-classes"],
    queryFn: () => apiGet<SchoolClass[]>("/academic/classes"),
  });
  const subjectsQ = useQuery({
    queryKey: ["academic-subjects"],
    queryFn: () => apiGet<SubjectRow[]>("/academic/subjects"),
  });

  const years = useMemo(() => yearsQ.data ?? [], [yearsQ.data]);
  const terms = useMemo(() => termsQ.data ?? [], [termsQ.data]);
  const allClasses = useMemo(() => classesQ.data ?? [], [classesQ.data]);
  const classes = useMemo(
    () => allClasses.filter((c) => !yearId || c.academicYearId === yearId),
    [allClasses, yearId],
  );
  const subjects = subjectsQ.data ?? [];

  useEffect(() => {
    if (!yearId && years.length) {
      const active = years.find((y) => y.isActive) ?? years[0];
      if (active) setYearId(active.id);
    }
  }, [years, yearId]);

  const activeTerm = terms.find((t) => t.isActive);
  const oLevel = classes.filter((c) => parseAcademicLevel(c.level) === "O_LEVEL").length;
  const aLevel = classes.filter((c) => parseAcademicLevel(c.level) === "A_LEVEL").length;

  const status = combineQueryStatus([yearsQ, termsQ, classesQ, subjectsQ]);
  const error =
    yearsQ.error ?? termsQ.error ?? classesQ.error ?? subjectsQ.error;

  return (
    <PageWrapper
      title="Academic structure"
      description="Read-only overview of years, terms, classes, and subjects. Open related tools from the Academic menu."
    >
      <div className="mb-6">
      <Card title="Academic year">
        <Select
          label="Year"
          options={
            years.length
              ? years.map((y) => ({ value: y.id, label: y.name ?? y.id }))
              : [{ value: "", label: "No years" }]
          }
          value={yearId}
          onChange={(e) => setYearId(e.target.value)}
        />
      </Card>
      </div>

      <AsyncContent
        status={status}
        loading={<p className="text-sm text-muted-foreground">Loading academic data…</p>}
        error={
          <ErrorState
            message={error instanceof Error ? error.message : "Failed to load academic data"}
            onRetry={() => {
              void yearsQ.refetch();
              void termsQ.refetch();
              void classesQ.refetch();
              void subjectsQ.refetch();
            }}
          />
        }
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Terms</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{terms.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTerm ? `Active: Term ${activeTerm.termNumber ?? "?"}` : "No active term"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Classes</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{classes.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {oLevel} O-Level · {aLevel} A-Level
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subjects</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{subjects.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Years on record</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{years.length}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={`Terms (${terms.length})`}>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Term</th>
                    <th className="px-3 py-2 text-left">Period</th>
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((t) => (
                    <tr key={t.id} className="border-t border-border/50">
                      <td className="px-3 py-2 font-medium">Term {t.termNumber ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {t.startDate && t.endDate
                          ? `${new Date(t.startDate).toLocaleDateString()} – ${new Date(t.endDate).toLocaleDateString()}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.isActive
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.isActive ? "Active" : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={`Classes (${classes.length})`}>
            <div className="max-h-80 overflow-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Class</th>
                    <th className="px-3 py-2 text-left">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} className="border-t border-border/50">
                      <td className="px-3 py-2 font-medium">
                        {c.name}
                        {c.stream ? <span className="text-muted-foreground"> · {c.stream}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.level ? levelLabel(parseAcademicLevel(c.level)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </AsyncContent>
    </PageWrapper>
  );
}
