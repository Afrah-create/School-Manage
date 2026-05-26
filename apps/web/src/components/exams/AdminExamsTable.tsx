"use client";

import Link from "next/link";
import type { ExamSummary } from "@uganda-cbc-sms/shared";
import { AdminExamRowActions } from "@/components/exams/AdminExamRowActions";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatDisplayDate } from "@/lib/dates";

function classLabel(exam: ExamSummary): string {
  const base = exam.className ?? "—";
  return exam.classStream ? `${base} · ${exam.classStream}` : base;
}

type Props = {
  exams: ExamSummary[];
  archivedView: boolean;
  busy: boolean;
  onEdit: (exam: ExamSummary) => void;
  onArchive: (exam: ExamSummary) => void;
  onOpen: (exam: ExamSummary) => void;
  onClose: (exam: ExamSummary) => void;
  onReopen: (exam: ExamSummary) => void;
  emptyTitle: string;
  emptyDescription: string;
};

export function AdminExamsTable({
  exams,
  archivedView,
  busy,
  onEdit,
  onArchive,
  onOpen,
  onClose,
  onReopen,
  emptyTitle,
  emptyDescription,
}: Props) {
  if (exams.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Exam
            </th>
            <th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
              Class
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date
            </th>
            <th className="hidden px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
              Papers
            </th>
            <th className="hidden px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
              Max
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {exams.map((exam) => (
            <tr
              key={exam.id}
              className="transition-ui odd:bg-background even:bg-muted/15 hover:bg-accent/50"
            >
              <td className="px-4 py-3 align-middle">
                <div className="min-w-[10rem]">
                  <Link
                    href={`/admin/exams/${exam.id}${exam.isArchived ? "?archived=1" : ""}`}
                    className="font-medium text-foreground hover:text-brand hover:underline"
                  >
                    {exam.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground md:hidden">{classLabel(exam)}</p>
                  {exam.isArchived ? (
                    <div className="mt-1.5">
                      <Badge tone="neutral">Archived</Badge>
                    </div>
                  ) : null}
                </div>
              </td>
              <td className="hidden px-4 py-3 align-middle text-muted-foreground md:table-cell">
                {classLabel(exam)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 align-middle tabular-nums text-muted-foreground">
                {formatDisplayDate(exam.examDate)}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 align-middle text-right tabular-nums sm:table-cell">
                {exam.subjectCount ?? "—"}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 align-middle text-right tabular-nums text-muted-foreground sm:table-cell">
                {exam.maxScore}
              </td>
              <td className="px-4 py-3 align-middle">
                <ExamStatusBadge status={exam.status} />
              </td>
              <td className="px-4 py-3 align-middle">
                <AdminExamRowActions
                  exam={exam}
                  archivedView={archivedView}
                  busy={busy}
                  onEdit={onEdit}
                  onArchive={onArchive}
                  onOpen={onOpen}
                  onClose={onClose}
                  onReopen={onReopen}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
