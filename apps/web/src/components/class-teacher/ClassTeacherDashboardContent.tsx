"use client";

import Link from "next/link";
import { Calendar, ClipboardCheck, ClipboardList, FileBarChart2, FileText, GraduationCap, Users } from "lucide-react";
import type { MyClassRow, MySubjectSlotRow } from "@/hooks/useMyTeachingScope";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DashboardQuickAccess } from "@/components/dashboard/DashboardQuickAccess";
import { DashboardTableSection } from "@/components/dashboard/DashboardTableSection";
import { TeacherTeachingScopeCard } from "@/components/teaching/TeacherTeachingScopeCard";
import { Badge } from "@/components/ui/Badge";
import { DashboardHeader, KpiGrid } from "@/components/layout/shells/DashboardScaffold";
import type { DashboardMetric } from "@/components/layout/shells/types";
import { classDisplayName } from "@/lib/academicLevel";

type AttRow = { status?: string; student_name?: string; student_number?: string };

type StudentPreview = { id: string; fullName: string; studentNumber: string };

type TodayLesson = {
  timetableEntryId: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
  className: string;
  classStream: string | null;
  attendanceStatus?: string;
};

const QUICK_GROUPS_HOMEROOM = [
  {
    title: "Homeroom",
    links: [
      { href: "/class-teacher/attendance", label: "Attendance", description: "Daily class register", icon: ClipboardList },
      { href: "/class-teacher/students", label: "Class list", description: "Your homeroom learners", icon: Users },
      { href: "/class-teacher/comments", label: "Report comments", description: "Headteacher remarks", icon: FileBarChart2 },
    ],
  },
  {
    title: "Teaching",
    links: [
      { href: "/class-teacher/timetable", label: "Timetable", description: "Your weekly schedule", icon: Calendar },
      { href: "/class-teacher/exams", label: "Exams", description: "Formal marking", icon: FileText },
      { href: "/class-teacher/assessment/alevel", label: "A-Level marks", description: "Term assessment", icon: ClipboardCheck },
    ],
  },
];

const QUICK_GROUPS_SUBJECT = [
  {
    title: "Your classes",
    links: [
      { href: "/class-teacher/students", label: "Learners", description: "Assigned class roster", icon: Users },
      { href: "/class-teacher/exams", label: "Exams", description: "Enter exam marks", icon: FileText },
      { href: "/class-teacher/assessment/alevel", label: "A-Level assessment", description: "Term scores", icon: ClipboardCheck },
      { href: "/class-teacher/timetable", label: "Timetable", description: "Lesson schedule", icon: Calendar },
    ],
  },
];

export function ClassTeacherDashboardContent({
  today,
  homeroomClass,
  homeroomLabel,
  previewSlot,
  yearName,
  subjectSlotCount,
  studentCount,
  absenteeCount,
  attendance,
  students,
  todayLessons,
  myClasses,
  subjectSlots,
  homeroomClasses,
}: {
  today: string;
  homeroomClass: MyClassRow | null;
  homeroomLabel: string | null;
  previewSlot: MySubjectSlotRow | null;
  yearName?: string;
  subjectSlotCount: number;
  studentCount: number;
  absenteeCount: number;
  attendance: AttRow[];
  students: StudentPreview[];
  todayLessons: TodayLesson[];
  myClasses: MyClassRow[];
  subjectSlots: MySubjectSlotRow[];
  homeroomClasses: MyClassRow[];
}) {
  const metrics: DashboardMetric[] = [
    {
      label: "Homeroom",
      value: homeroomLabel ?? "Not assigned",
      delta: homeroomClass ? yearName ?? "This year" : "Subject-only",
      deltaTone: homeroomClass ? "positive" : "neutral",
    },
    {
      label: "Learners",
      value: studentCount > 0 ? String(studentCount) : "—",
      delta: homeroomClass ? "Homeroom roster" : "Assigned class",
      deltaTone: "neutral",
    },
    {
      label: "Subject slots",
      value: String(subjectSlotCount),
      delta: yearName ?? "This year",
      deltaTone: subjectSlotCount > 0 ? "positive" : "neutral",
    },
    {
      label: "Absent today",
      value: homeroomClass ? String(absenteeCount) : "—",
      delta: homeroomClass ? (absenteeCount > 0 ? "Follow up" : "All present") : "Homeroom only",
      deltaTone: homeroomClass ? (absenteeCount > 0 ? "negative" : "positive") : "neutral",
    },
  ];

  const quickGroups = homeroomClass ? QUICK_GROUPS_HOMEROOM : QUICK_GROUPS_SUBJECT;

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Class teacher dashboard"
        description="Homeroom duties, attendance, and your teaching assignments."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{today}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {todayLessons.length} lesson{todayLessons.length === 1 ? "" : "s"} on your timetable
          </p>
          {homeroomClass ? (
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Absentees: </span>
              <span className="font-semibold tabular-nums">{absenteeCount}</span>
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-brand/8 to-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your focus class</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {homeroomLabel ??
              (previewSlot
                ? `${previewSlot.subjectCode} · ${classDisplayName({ name: previewSlot.className, stream: previewSlot.classStream })}`
                : "No assignment")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{yearName ?? "Current academic year"}</p>
        </div>
      </section>

      <KpiGrid metrics={metrics} />

      <DashboardQuickAccess groups={quickGroups} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="min-w-0 space-y-6">
          {homeroomClass ? (
            <DashboardTableSection
              title={`Attendance today`}
              subtitle={homeroomLabel ?? "Homeroom register"}
              headerLink="/class-teacher/attendance"
              headerLinkLabel="Open register"
            >
              <table className="w-full min-w-[24rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Student
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length ? (
                    attendance.map((row, index) => {
                      const isAbsent = row.status === "absent";
                      return (
                        <tr key={`${row.student_number}-${index}`} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-3.5">
                            <span className="font-medium">{row.student_name ?? "Unknown"}</span>
                            <span className="ml-2 text-xs text-muted-foreground">#{row.student_number ?? "—"}</span>
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            {isAbsent ? <Badge tone="warning">Absent</Badge> : <Badge tone="success">Present</Badge>}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={2} className="p-0">
                        <EmptyState
                          title="No attendance yet"
                          description="Mark today's register."
                          icon={ClipboardList}
                          action={{ label: "Take attendance", href: "/class-teacher/attendance" }}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DashboardTableSection>
          ) : previewSlot ? (
            <DashboardTableSection
              title="Learners"
              subtitle={`${previewSlot.subjectCode} — ${classDisplayName({ name: previewSlot.className, stream: previewSlot.classStream })}`}
              headerLink="/class-teacher/students"
              headerLinkLabel="Full class list"
            >
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
                    students.slice(0, 12).map((s) => (
                      <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-3.5 font-medium">{s.fullName}</td>
                        <td className="px-3 py-3.5 text-right tabular-nums text-muted-foreground">{s.studentNumber}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="p-0">
                        <EmptyState title="No learners" description="Students appear when enrolled." icon={GraduationCap} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </DashboardTableSection>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
              <EmptyState
                title="No assignments yet"
                description="Ask admin to assign you as class head or subject teacher."
              />
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <TeacherTeachingScopeCard
            myClasses={myClasses}
            subjectSlots={subjectSlots}
            homeroomClasses={homeroomClasses}
            academicYearName={yearName}
          />
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Today&apos;s lessons</h2>
            <p className="mb-4 text-sm text-muted-foreground">From your published timetable.</p>
            {todayLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lessons scheduled today.</p>
            ) : (
              <ul className="space-y-2">
                {todayLessons.map((l) => (
                  <li key={l.timetableEntryId} className="rounded-lg border border-border px-3 py-2.5 text-sm">
                    <p className="font-medium tabular-nums">
                      {l.startTime}–{l.endTime} · {l.subjectCode}
                    </p>
                    <p className="text-muted-foreground">
                      {classDisplayName({ name: l.className, stream: l.classStream ?? "" })}
                    </p>
                    <Link
                      href={`/class-teacher/attendance?timetableEntryId=${encodeURIComponent(l.timetableEntryId)}&date=${encodeURIComponent(today)}`}
                      className="mt-1 inline-block text-xs font-medium text-brand hover:underline"
                    >
                      {l.attendanceStatus === "submitted" || l.attendanceStatus === "locked"
                        ? "View register"
                        : "Take attendance"}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/class-teacher/timetable" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              Full timetable →
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
