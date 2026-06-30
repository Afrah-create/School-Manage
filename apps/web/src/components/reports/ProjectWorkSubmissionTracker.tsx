"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import type { ProjectWorkSubmissionTrack } from "@/hooks/useReports";

const STATUS_LABEL: Record<ProjectWorkSubmissionTrack["status"], string> = {
  submitted: "Complete",
  in_progress: "In progress",
  not_started: "Not started",
  not_required: "Not required",
};

const STATUS_TONE: Record<
  ProjectWorkSubmissionTrack["status"],
  "success" | "warning" | "neutral"
> = {
  submitted: "success",
  in_progress: "warning",
  not_started: "neutral",
  not_required: "neutral",
};

type Filter = "all" | "required" | "pending";

export function ProjectWorkSubmissionTracker({
  rows,
}: {
  rows: ProjectWorkSubmissionTrack[];
}) {
  const [filter, setFilter] = useState<Filter>("required");

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "pending") {
      return rows.filter(
        (r) => r.projectWorkRequired && r.status !== "submitted" && r.status !== "not_required",
      );
    }
    return rows.filter((r) => r.projectWorkRequired);
  }, [filter, rows]);

  const columns: Column<ProjectWorkSubmissionTrack>[] = [
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
      render: (r) => r.teacherName ?? "Not assigned",
    },
    {
      key: "progress",
      header: "Learners meeting target",
      render: (r) => (
        <div className="text-sm">
          {r.studentsMeetingExpected} / {r.activeStudents}
          <span className="text-muted-foreground"> · {r.projectsExpected} projects expected</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
      ),
    },
  ];

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No class subjects for this year.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["required", "pending", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              filter === f ? "bg-brand text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            {f === "required" ? "Required" : f === "pending" ? "Pending" : "All subjects"}
          </button>
        ))}
      </div>
      <Table
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rows={visible as unknown as Record<string, unknown>[]}
        pageSize={15}
        emptyState={<p className="text-sm text-muted-foreground">No matching subjects.</p>}
      />
    </div>
  );
}
