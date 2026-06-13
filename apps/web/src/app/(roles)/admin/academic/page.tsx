"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { queryKeys, STRUCTURAL_STALE_MS } from "@/lib/queryKeys";
import { getApiTenantSlug } from "@/lib/tenantHost";

const SETUP_LINKS = [
  {
    href: "/admin/academic/structure",
    title: "Structure setup",
    desc: "Auto-install years, 3 terms, and default classes",
  },
  { href: "/admin/academic/years", title: "Academic years", desc: "Create and view school years" },
  { href: "/admin/academic/terms", title: "Terms", desc: "Terms within a year" },
  { href: "/admin/academic/classes", title: "Classes", desc: "Streams and O-Level / A-Level class groups" },
  { href: "/admin/academic/subjects", title: "Subjects", desc: "O-Level and A-Level subject catalogue" },
];

const CURRICULUM_LINKS = [
  {
    href: "/admin/academic/curriculum",
    title: "Curriculum setup",
    desc: "Auto-install subjects, CBC strands, and class–subject slots",
  },
  { href: "/admin/academic/combinations", title: "Subject combinations", desc: "O-Level and A-Level combinations" },
  { href: "/admin/academic/cbc-strands", title: "CBC strands", desc: "O-Level strands and sub-strands" },
  { href: "/admin/academic/grading-scales", title: "Grading scales", desc: "Grade ranges, points, and descriptors" },
];

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
    <PageWrapper title="Academic" description="Structure, years, terms, classes, subjects, and teaching assignments">
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

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">School structure</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {SETUP_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-lg border border-border bg-card p-4 transition-ui hover:bg-accent"
            >
              <div className="font-semibold text-brand">{l.title}</div>
              <p className="text-sm text-muted-foreground">{l.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Curriculum & grading</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {CURRICULUM_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-lg border border-border bg-card p-4 transition-ui hover:bg-accent"
            >
              <div className="font-semibold text-brand">{l.title}</div>
              <p className="text-sm text-muted-foreground">{l.desc}</p>
            </Link>
          ))}
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
