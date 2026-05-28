"use client";

import Link from "next/link";
import { ClipboardCheck, FileText, GraduationCap } from "lucide-react";
import type { MyClassRow, MySubjectSlotRow } from "@/hooks/useMyTeachingScope";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DashboardQuickAccess } from "@/components/dashboard/DashboardQuickAccess";
import { DashboardTableSection } from "@/components/dashboard/DashboardTableSection";
import { TeacherTeachingScopeCard } from "@/components/teaching/TeacherTeachingScopeCard";
import { DashboardHeader, KpiGrid } from "@/components/layout/shells/DashboardScaffold";
import type { DashboardMetric } from "@/components/layout/shells/types";
import { classDisplayName } from "@/lib/academicLevel";

type StudentPreview = { id: string; fullName: string; studentNumber: string };

const QUICK_GROUPS = [
  {
    title: "Marking",
    links: [
      { href: "/subject-teacher/exams", label: "Exams", description: "Formal exam entry", icon: FileText },
      { href: "/subject-teacher/assessment/alevel", label: "A-Level assessment", description: "Term scores", icon: ClipboardCheck },
      { href: "/subject-teacher/assessment/cbc", label: "CBC assessment", description: "Competency ratings", icon: ClipboardCheck },
    ],
  },
  {
    title: "Your assignments",
    links: [
      { href: "/subject-teacher/students", label: "Class rosters", description: "Learners per class", icon: GraduationCap },
    ],
  },
];

export function SubjectTeacherDashboardContent({
  previewSlot,
  yearName,
  termLabel,
  subjectSlotCount,
  uniqueClassCount,
  cbcTotal,
  cbcSubmitted,
  cbcPending,
  students,
  studentsTotal,
  myClasses,
  subjectSlots,
  homeroomClasses,
}: {
  previewSlot: MySubjectSlotRow | null;
  yearName?: string;
  termLabel: string;
  subjectSlotCount: number;
  uniqueClassCount: number;
  cbcTotal: number;
  cbcSubmitted: number;
  cbcPending: number;
  students: StudentPreview[];
  studentsTotal?: number;
  myClasses: MyClassRow[];
  subjectSlots: MySubjectSlotRow[];
  homeroomClasses: MyClassRow[];
}) {
  const metrics: DashboardMetric[] = [
    {
      label: "Subject slots",
      value: String(subjectSlotCount),
      delta: yearName ?? "This year",
      deltaTone: subjectSlotCount > 0 ? "positive" : "negative",
    },
    {
      label: "Classes",
      value: String(uniqueClassCount),
      delta: "With assigned subjects",
      deltaTone: "neutral",
    },
    {
      label: "CBC rows",
      value: subjectSlotCount > 0 ? String(cbcTotal) : "—",
      delta: `${cbcSubmitted} done · ${cbcPending} pending`,
      deltaTone: cbcPending > 0 ? "negative" : "positive",
    },
    {
      label: "Active term",
      value: termLabel,
      delta: termLabel !== "Not set" ? "Ready" : "Missing",
      deltaTone: termLabel !== "Not set" ? "positive" : "negative",
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Subject teacher dashboard"
        description="Your class–subject assignments for marking, exams, and assessments."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Teaching load</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{subjectSlotCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Subject slot{subjectSlotCount === 1 ? "" : "s"} across {uniqueClassCount} class
            {uniqueClassCount === 1 ? "" : "es"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-brand/8 to-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CBC this term</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{cbcSubmitted}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted of {cbcTotal} rows · {cbcPending} pending
          </p>
          {cbcPending > 0 ? (
            <Link
              href="/subject-teacher/assessment/cbc"
              className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
            >
              Continue CBC entry →
            </Link>
          ) : null}
        </div>
      </section>

      <KpiGrid metrics={metrics} />

      <DashboardQuickAccess groups={QUICK_GROUPS} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <DashboardTableSection
          title="Learners"
          subtitle={
            previewSlot
              ? `${previewSlot.subjectCode} · ${classDisplayName({ name: previewSlot.className, stream: previewSlot.classStream })}`
              : "Assign a subject slot to see a class roster"
          }
          headerLink={previewSlot ? "/subject-teacher/students" : undefined}
          headerLinkLabel={previewSlot ? "All classes" : undefined}
        >
          {subjectSlotCount === 0 ? (
            <EmptyState
              title="No subject assignments"
              description="Ask admin to assign you on Subject teachers."
              icon={GraduationCap}
            />
          ) : (
            <table className="w-full min-w-[24rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Student #
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.length ? (
                  students.map((s) => (
                    <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-3.5 font-medium">{s.fullName}</td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-muted-foreground">{s.studentNumber}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No learners in this class yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {studentsTotal && studentsTotal > students.length ? (
            <p className="mt-3 px-3 text-xs text-muted-foreground">
              Showing {students.length} of {studentsTotal} learners.
            </p>
          ) : null}
        </DashboardTableSection>

        <aside>
          <TeacherTeachingScopeCard
            myClasses={myClasses}
            subjectSlots={subjectSlots}
            homeroomClasses={homeroomClasses}
            academicYearName={yearName}
          />
        </aside>
      </section>
    </div>
  );
}
