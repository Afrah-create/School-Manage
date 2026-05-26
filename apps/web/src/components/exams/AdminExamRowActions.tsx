"use client";

import Link from "next/link";
import type { ExamSummary } from "@uganda-cbc-sms/shared";

const menuBtn =
  "block w-full rounded px-2.5 py-2 text-left text-xs text-foreground transition-ui hover:bg-accent disabled:pointer-events-none disabled:opacity-50";
const menuDanger =
  "block w-full rounded px-2.5 py-2 text-left text-xs text-amber-800 transition-ui hover:bg-amber-500/10 disabled:pointer-events-none disabled:opacity-50 dark:text-amber-300";

type Props = {
  exam: ExamSummary;
  onEdit: (exam: ExamSummary) => void;
  onArchive: (exam: ExamSummary) => void;
  onOpen: (exam: ExamSummary) => void;
  onClose: (exam: ExamSummary) => void;
  onReopen: (exam: ExamSummary) => void;
  busy?: boolean;
  archivedView?: boolean;
};

export function AdminExamRowActions({
  exam,
  onEdit,
  onArchive,
  onOpen,
  onClose,
  onReopen,
  busy,
  archivedView,
}: Props) {
  const detailHref = `/admin/exams/${exam.id}${archivedView || exam.isArchived ? "?archived=1" : ""}`;

  if (archivedView || exam.isArchived) {
    return (
      <div className="flex justify-end">
        <Link
          href={detailHref}
          className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-ui hover:bg-accent"
        >
          View
        </Link>
      </div>
    );
  }

  const hasLifecycle =
    exam.status === "draft" || exam.status === "open" || exam.status === "closed";

  return (
    <div className="flex justify-end">
      <details className="relative">
        <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-ui hover:bg-accent [&::-webkit-details-marker]:hidden">
          Actions
          <span className="text-muted-foreground" aria-hidden>
            ▾
          </span>
        </summary>
        <div
          className="absolute right-0 z-20 mt-1 min-w-[11.5rem] rounded-md border border-border bg-card p-1 shadow-md"
          role="menu"
        >
          <Link href={detailHref} className={menuBtn} role="menuitem">
            View details
          </Link>

          {hasLifecycle ? <div className="my-1 border-t border-border" role="separator" /> : null}

          {exam.status === "draft" ? (
            <>
              <button type="button" className={menuBtn} disabled={busy} onClick={() => onEdit(exam)} role="menuitem">
                Edit draft
              </button>
              <button type="button" className={menuBtn} disabled={busy} onClick={() => onOpen(exam)} role="menuitem">
                Open for marking
              </button>
            </>
          ) : null}

          {exam.status === "open" ? (
            <button type="button" className={menuBtn} disabled={busy} onClick={() => onClose(exam)} role="menuitem">
              Close exam
            </button>
          ) : null}

          {exam.status === "closed" ? (
            <button type="button" className={menuBtn} disabled={busy} onClick={() => onReopen(exam)} role="menuitem">
              Reopen for marking
            </button>
          ) : null}

          <div className="my-1 border-t border-border" role="separator" />

          <button type="button" className={menuDanger} disabled={busy} onClick={() => onArchive(exam)} role="menuitem">
            Archive…
          </button>
        </div>
      </details>
    </div>
  );
}
