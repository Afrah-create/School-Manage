"use client";

import Link from "next/link";
import type { AcademicLevel } from "@/lib/academicLevel";
import { levelShortLabel } from "@/lib/academicLevel";
import { Card } from "@/components/ui/Card";

type Step = {
  n: number;
  title: string;
  body: string;
  href: string;
  cta: string;
};

export function TeachingAssignmentSteps({
  level,
  yearId,
  hrefWithLevel,
}: {
  level: AcademicLevel;
  yearId: string;
  hrefWithLevel: (path: string, extra?: Record<string, string>) => string;
}) {
  const track = levelShortLabel(level);
  const yearQ = yearId ? { academicYearId: yearId } : undefined;

  const steps: Step[] = [
    {
      n: 1,
      title: "Class teachers (homeroom)",
      body: `Assign homeroom and class teachers for each ${track} class — the only place for class staffing (by class or by teacher).`,
      href: hrefWithLevel("/admin/academic/class-teachers", yearQ),
      cta: "Class teachers",
    },
    {
      n: 2,
      title: "Subjects on the timetable",
      body: `Add which ${track} subjects each class offers. Only subjects matching the class level can be selected.`,
      href: hrefWithLevel("/admin/academic/class-subjects", yearQ),
      cta: "Manage class subjects",
    },
    {
      n: 3,
      title: "Subject teachers",
      body: `Set teachable subjects and allocate staff to each ${track} class–subject slot. This is the only place to assign teachers to subjects.`,
      href: hrefWithLevel("/admin/academic/teacher-assignments", yearQ),
      cta: "Subject teachers",
    },
    {
      n: 4,
      title: "Weekly timetable",
      body: `Schedule when each ${track} class–subject slot occurs (periods and days). Publish for teachers.`,
      href: hrefWithLevel("/admin/academic/timetable", yearQ),
      cta: "Timetable builder",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((s) => (
        <Card key={s.n}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {s.n}</p>
          <h3 className="mt-1 font-semibold text-foreground">{s.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          <Link
            href={s.href}
            className="mt-4 inline-flex text-sm font-medium text-brand hover:underline"
          >
            {s.cta} →
          </Link>
        </Card>
      ))}
    </div>
  );
}
