"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { Table, type Column } from "@/components/ui/Table";
import { useExamMarkingSlots, type ExamMarkingSlot } from "@/hooks/useExams";
import { queryStatus } from "@/lib/queryStatus";

export function TeacherExamMarkingList({ basePath }: { basePath: string }) {
  const slotsQ = useExamMarkingSlots();
  const status = queryStatus(slotsQ, (d) => d.length === 0);

  const columns: Column<ExamMarkingSlot>[] = [
    {
      key: "subject",
      header: "Your subject",
      render: (r) => (
        <div>
          <div className="font-medium">
            {r.subjectCode} — {r.subjectName}
          </div>
          <div className="text-xs text-muted-foreground">{r.examName}</div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (r) => (
        <span>
          {r.className}
          {r.classStream ? ` · ${r.classStream}` : ""}
        </span>
      ),
    },
    { key: "date", header: "Exam date", render: (r) => r.examDate ?? "—" },
    { key: "max", header: "Max", render: (r) => String(r.maxScore) },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge tone={r.isSubmitted ? "success" : r.canEdit ? "warning" : "neutral"}>
          {r.isSubmitted ? "Submitted" : "Enter marks"}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "",
      render: (r) => (
        <Link
          className="text-sm font-medium text-brand underline"
          href={`${basePath}/${r.examId}?subjectId=${encodeURIComponent(r.subjectId)}`}
        >
          {r.isSubmitted ? "View" : "Enter marks"}
        </Link>
      ),
    },
  ];

  return (
    <AsyncContent
      status={status}
      loading={<TableSkeleton rows={6} cols={5} />}
      error={
        <ErrorState
          message={
            slotsQ.error instanceof Error
              ? slotsQ.error.message
              : "We couldn't load your exam marking tasks."
          }
          onRetry={() => void slotsQ.refetch()}
        />
      }
      empty={
        <EmptyState
          title="No open exams for your subjects"
          description="When an administrator opens a formal exam and you are the assigned subject teacher on the class timetable, your papers appear here for score entry."
        />
      }
    >
      <Table
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        rows={(slotsQ.data ?? []) as unknown as Record<string, unknown>[]}
      />
    </AsyncContent>
  );
}
