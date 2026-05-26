"use client";

import Link from "next/link";
import type { ExamSummary } from "@uganda-cbc-sms/shared";
import { Button } from "@/components/ui/Button";

type Props = {
  exam: ExamSummary;
  onEdit: (exam: ExamSummary) => void;
  onDelete: (exam: ExamSummary) => void;
  onOpen: (exam: ExamSummary) => void;
  onClose: (exam: ExamSummary) => void;
  onReopen: (exam: ExamSummary) => void;
  busy?: boolean;
};

export function AdminExamRowActions({
  exam,
  onEdit,
  onDelete,
  onOpen,
  onClose,
  onReopen,
  busy,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link className="text-sm font-medium text-brand underline" href={`/admin/exams/${exam.id}`}>
        Manage
      </Link>
      {exam.status === "draft" ? (
        <>
          <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => onEdit(exam)}>
            Edit
          </Button>
          <Button type="button" className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => onOpen(exam)}>
            Open
          </Button>
        </>
      ) : null}
      {exam.status === "open" ? (
        <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => onClose(exam)}>
          Close
        </Button>
      ) : null}
      {exam.status === "closed" ? (
        <Button type="button" className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => onReopen(exam)}>
          Reopen
        </Button>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        className="!px-2 !py-1 text-xs text-red-700 dark:text-red-400"
        disabled={busy}
        onClick={() => onDelete(exam)}
      >
        Delete
      </Button>
    </div>
  );
}
