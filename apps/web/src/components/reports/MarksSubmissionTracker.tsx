"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import type { ReportReadiness, SubjectSubmissionTrack } from "@/hooks/useReports";

const STATUS_LABEL: Record<SubjectSubmissionTrack["status"], string> = {
  submitted: "Submitted",
  in_progress: "In progress",
  not_started: "Not started",
};

const STATUS_TONE: Record<
  SubjectSubmissionTrack["status"],
  "success" | "warning" | "neutral"
> = {
  submitted: "success",
  in_progress: "warning",
  not_started: "neutral",
};

type Filter = "all" | "pending" | "submitted";

export function MarksSubmissionTracker({ data }: { data: ReportReadiness }) {
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const list = data.subjectTracking ?? [];
    if (filter === "pending") return list.filter((r) => r.status !== "submitted");
    if (filter === "submitted") return list.filter((r) => r.status === "submitted");
    return list;
  }, [data.subjectTracking, filter]);

  const columns: Column<SubjectSubmissionTrack>[] = [
    {
      key: "subject",
      header: "Subject",
      render: (r) => (
        <div>
          <div className="font-medium">{r.subjectCode}</div>
          <div className="text-xs text-muted-foreground">{r.subjectName}</div>
        </div>
      ),
    },
    {
      key: "teacher",
      header: "Teacher",
      render: (r) => (
        <div>
          <div>{r.teacherName ?? "Not assigned"}</div>
          {r.teacherEmail ? (
            <div className="text-xs text-muted-foreground">{r.teacherEmail}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "progress",
      header: "Students submitted",
      render: (r) => {
        const pct =
          r.activeStudents > 0
            ? Math.round((r.studentsSubmitted / r.activeStudents) * 100)
            : 0;
        return (
          <div className="min-w-[140px]">
            <div className="text-sm">
              {r.studentsSubmitted} / {r.activeStudents}
              {r.studentsWithMarks < r.activeStudents && r.studentsWithMarks > 0 ? (
                <span className="text-muted-foreground">
                  {" "}
                  ({r.studentsWithMarks} with marks)
                </span>
              ) : null}
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
      ),
    },
    {
      key: "lastSubmittedAt",
      header: "Last submitted",
      render: (r) =>
        r.lastSubmittedAt
          ? new Date(r.lastSubmittedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          <strong>{data.submittedCount ?? 0}</strong> of{" "}
          <strong>{data.totalSubjects ?? 0}</strong> subjects submitted
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          <strong>{data.activeStudents}</strong> active students in class
        </span>
      </div>

      {(data.teachersPending?.length ?? 0) > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">Follow up with these teachers</p>
          <ul className="mt-2 space-y-1 text-amber-800 dark:text-amber-100/90">
            {data.teachersPending!.map((t) => (
              <li key={t.teacherId ?? t.teacherName}>
                <strong>{t.teacherName}</strong>
                {t.teacherEmail ? ` (${t.teacherEmail})` : ""} — pending:{" "}
                {t.subjects.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : data.ready ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          All teachers have submitted marks for their subjects. You can generate report cards.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All subjects"],
            ["pending", "Pending only"],
            ["submitted", "Submitted only"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === id
                ? "bg-brand text-white"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Table
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rows={rows as unknown as Record<string, unknown>[]}
        pageSize={15}
        emptyState={
          <p className="text-sm text-muted-foreground">
            {filter === "pending"
              ? "No pending subjects — all marks are submitted."
              : "No subjects assigned to this class for the selected year."}
          </p>
        }
      />
    </div>
  );
}
