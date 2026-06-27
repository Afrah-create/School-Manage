"use client";

import Link from "next/link";
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
} from "lucide-react";
import type { MyClassRow, MySubjectSlotRow } from "@/hooks/useMyTeachingScope";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DashboardQuickAccess } from "@/components/dashboard/DashboardQuickAccess";
import { DashboardTableSection } from "@/components/dashboard/DashboardTableSection";
import { TeacherTeachingScopeCard } from "@/components/teaching/TeacherTeachingScopeCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DashboardHeader, KpiGrid } from "@/components/layout/shells/DashboardScaffold";
import type { DashboardMetric } from "@/components/layout/shells/types";
import { classDisplayName } from "@/lib/academicLevel";

type StudentPreview = { id: string; fullName: string; studentNumber: string };

const QUICK_GROUPS = [
  {
    title: "Formal exams",
    links: [
      { href: "/subject-teacher/exams", label: "Exams", description: "Enter and review exam marks", icon: FileText },
    ],
  },
  {
    title: "Term assessment",
    links: [
      {
        href: "/subject-teacher/assessment/alevel",
        label: "A-Level scores",
        description: "Term marks by class",
        icon: ClipboardCheck,
      },
      {
        href: "/subject-teacher/assessment/cbc",
        label: "Competency assessment",
        description: "NCDC competency ratings and activities",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Classes & schedule",
    links: [
      {
        href: "/subject-teacher/students",
        label: "Class rosters",
        description: "Learners in your classes",
        icon: GraduationCap,
      },
      {
        href: "/subject-teacher/timetable",
        label: "Timetable",
        description: "Your weekly lessons",
        icon: Calendar,
      },
      {
        href: "/subject-teacher/attendance",
        label: "Attendance",
        description: "Lesson registers",
        icon: ClipboardList,
      },
    ],
  },
];

function cbcProgressPercent(submitted: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((submitted / total) * 100));
}

function previewClassLabel(slot: MySubjectSlotRow): string {
  return `${slot.subjectCode} · ${classDisplayName({ name: slot.className, stream: slot.classStream })}`;
}

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
  const cbcPct = cbcProgressPercent(cbcSubmitted, cbcTotal);
  const hasAssignments = subjectSlotCount > 0;

  const metrics: DashboardMetric[] = [
    {
      label: "Subject slots",
      value: String(subjectSlotCount),
      delta: yearName ?? "This year",
      deltaTone: hasAssignments ? "positive" : "negative",
    },
    {
      label: "Classes",
      value: String(uniqueClassCount),
      delta: "With assigned subjects",
      deltaTone: "neutral",
    },
    {
      label: "Legacy sheet rows",
      value: hasAssignments ? String(cbcTotal) : "—",
      delta: `${cbcSubmitted} submitted · ${cbcPending} pending`,
      deltaTone: cbcPending > 0 ? "negative" : "positive",
    },
    {
      label: "Active term",
      value: termLabel,
      delta: termLabel !== "Not set" ? "Ready" : "Missing",
      deltaTone: termLabel !== "Not set" ? "positive" : "negative",
    },
  ];

  const rosterFooter =
    studentsTotal && studentsTotal > students.length ? (
      <p className="text-xs text-muted-foreground">
        Showing {students.length} of {studentsTotal} learners in this class.
      </p>
    ) : null;

  return (
    <div className="space-y-8">
      <DashboardHeader
        eyebrow="Subject teacher"
        title="Dashboard"
        description="Your class–subject assignments for marking, exams, and assessments."
        meta={
          <span className="text-xs text-muted-foreground">
            {yearName ?? "Current academic year"} · {termLabel}
            {previewSlot ? ` · ${previewClassLabel(previewSlot)}` : ""}
          </span>
        }
        actions={
          <Link href="/subject-teacher/students">
            <Button variant="secondary">Class rosters</Button>
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-h-[9.5rem] flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Teaching load</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{subjectSlotCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Subject slot{subjectSlotCount === 1 ? "" : "s"} across {uniqueClassCount} class
            {uniqueClassCount === 1 ? "" : "es"}
            {yearName ? ` · ${yearName}` : ""}
          </p>
          <div className="mt-auto pt-4">
            {hasAssignments ? (
              <Link href="/subject-teacher/students" className="text-sm font-medium text-brand hover:underline">
                View all rosters →
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No assignments linked yet.</p>
            )}
          </div>
        </div>

        <div className="flex min-h-[9.5rem] flex-col rounded-xl border border-border bg-gradient-to-br from-brand/8 to-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Primary assignment</p>
          <p className="mt-2 text-xl font-semibold leading-snug text-foreground">
            {previewSlot ? previewClassLabel(previewSlot) : "No subject slot"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{termLabel}</p>
          {hasAssignments && cbcTotal > 0 ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Legacy sheet submitted</span>
                <span className="font-medium tabular-nums text-foreground">
                  {cbcSubmitted}/{cbcTotal}
                  {cbcPending > 0 ? (
                    <span className="ml-2 inline-flex align-middle">
                      <Badge tone="warning">{cbcPending} pending</Badge>
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex align-middle">
                      <Badge tone="success">Complete</Badge>
                    </span>
                  )}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={cbcPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Legacy CBC sheet submission progress"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width]"
                  style={{ width: `${cbcPct}%` }}
                />
              </div>
            </div>
          ) : hasAssignments && cbcPending > 0 ? (
            <Link
              href="/subject-teacher/assessment/cbc"
              className="mt-auto inline-block pt-4 text-sm font-medium text-brand hover:underline"
            >
              Continue competency entry →
            </Link>
          ) : null}
        </div>
      </section>

      <KpiGrid metrics={metrics} />

      <DashboardQuickAccess groups={QUICK_GROUPS} />

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="min-w-0">
          {!hasAssignments ? (
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
              <EmptyState
                title="No subject assignments"
                description="Ask your administrator to assign you on Subject teachers."
                icon={GraduationCap}
              />
            </div>
          ) : (
            <DashboardTableSection
              title="Learners preview"
              subtitle={
                previewSlot
                  ? previewClassLabel(previewSlot)
                  : "First assigned class–subject slot"
              }
              headerLink="/subject-teacher/students"
              headerLinkLabel="All rosters"
              footer={rosterFooter}
            >
              {subjectSlots.length > 1 ? (
                <div className="mb-3 flex flex-wrap gap-2 px-1">
                  {subjectSlots.slice(0, 6).map((slot) => (
                    <span
                      key={`${slot.classId}-${slot.subjectId}`}
                      className={`inline-flex max-w-full items-center rounded-md border px-2.5 py-1 text-xs font-medium ${
                        previewSlot &&
                        slot.classId === previewSlot.classId &&
                        slot.subjectId === previewSlot.subjectId
                          ? "border-brand/40 bg-brand/10 text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground"
                      }`}
                      title={slot.subjectName}
                    >
                      <span className="truncate">{previewClassLabel(slot)}</span>
                    </span>
                  ))}
                  {subjectSlots.length > 6 ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
                      +{subjectSlots.length - 6} more
                    </span>
                  ) : null}
                </div>
              ) : null}
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
                      <tr
                        key={s.id}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-3.5 font-medium text-foreground">{s.fullName}</td>
                        <td className="px-3 py-3.5 text-right tabular-nums text-muted-foreground">
                          {s.studentNumber}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-3 py-10 text-center text-sm text-muted-foreground">
                        No learners enrolled in this class yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DashboardTableSection>
          )}
        </div>

        <aside className="min-w-0">
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
