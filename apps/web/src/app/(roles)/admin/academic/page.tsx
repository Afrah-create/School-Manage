"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { queryKeys, STRUCTURAL_STALE_MS } from "@/lib/queryKeys";
import { getApiTenantSlug } from "@/lib/tenantHost";

type AcademicSummary = {
  years: number;
  terms: number;
  classes: number;
  subjects: number;
  classSubjects: number;
  combinations: number;
  cbcStrands: number;
  gradingScales: number;
};

export default function AdminAcademicHubPage() {
  const summaryQ = useQuery({
    queryKey: queryKeys.academicSummary(getApiTenantSlug()),
    queryFn: () => apiGet<AcademicSummary>("/academic/summary"),
    staleTime: STRUCTURAL_STALE_MS,
  });

  const counts = summaryQ.data ?? null;
  const loading = summaryQ.isPending;
  const err =
    summaryQ.error instanceof Error ? summaryQ.error.message : summaryQ.isError ? "Failed to load" : null;

  return (
    <PageWrapper
      title="Academic"
      description="Use the Academic menu in the sidebar for structure, curriculum, assignments, and timetable tools."
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Track year-by-year readiness for competency assessment on{" "}
        <Link href="/admin/academic/setup" className="font-medium text-brand hover:underline">
          Setup status
        </Link>
        .
      </p>
      {loading ? <p className="animate-pulse text-muted-foreground">Loading summary…</p> : null}
      {err ? <Alert tone="error">{err}</Alert> : null}
      {counts ? (
        <p className="mb-6 mt-3 text-sm text-muted-foreground">
          {counts.years} years · {counts.terms} terms · {counts.classes} classes · {counts.subjects} subjects ·{" "}
          {counts.classSubjects} class–subject slots · {counts.combinations} combinations · {counts.cbcStrands} strands ·{" "}
          {counts.gradingScales} grade bands
        </p>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Teaching assignments</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Assign class teachers, subject teachers, and weekly timetables in a clear 4-step flow. O-Level (CBC) and A-Level (UNEB) are
          configured separately — switch level on the assignments page.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/academic/assignments?level=O_LEVEL"
            className="block rounded-lg border border-brand/30 bg-brand/5 p-4 transition-ui hover:bg-brand/10"
          >
            <div className="font-semibold text-brand">O-Level teaching assignments</div>
            <p className="text-sm text-muted-foreground">
              Homeroom, timetable subjects, and subject teachers for CBC classes.
            </p>
          </Link>
          <Link
            href="/admin/academic/assignments?level=A_LEVEL"
            className="block rounded-lg border border-brand/30 bg-brand/5 p-4 transition-ui hover:bg-brand/10"
          >
            <div className="font-semibold text-brand">A-Level teaching assignments</div>
            <p className="text-sm text-muted-foreground">
              Homeroom, combination subjects, and subject teachers for UNEB classes.
            </p>
          </Link>
        </div>
      </section>

      <div className="mt-8">
        <Card title="Assignment workflow">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <strong className="font-medium text-foreground">Class teachers</strong> — homeroom head and any extra
              class teachers for the year.
            </li>
            <li>
              <strong className="font-medium text-foreground">Class subjects</strong> — which subjects each class
              offers on its timetable.
            </li>
            <li>
              <strong className="font-medium text-foreground">Subject teachers</strong> — who teaches each
              class–subject slot (marks, exams, assessments).
            </li>
            <li>
              <strong className="font-medium text-foreground">Weekly timetable</strong> — when each lesson occurs;
              build and publish on{" "}
              <Link href="/admin/academic/timetable" className="text-brand hover:underline">
                Timetable
              </Link>
              .
            </li>
          </ol>
        </Card>
      </div>
    </PageWrapper>
  );
}
