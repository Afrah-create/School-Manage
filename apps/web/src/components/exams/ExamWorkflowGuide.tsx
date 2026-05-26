"use client";

export function ExamWorkflowGuide() {
  return (
    <details className="group rounded-xl border border-border bg-gradient-to-br from-brand/5 to-transparent text-sm shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-foreground transition-ui hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-muted-foreground transition-ui group-open:rotate-90" aria-hidden>
            ▸
          </span>
          How formal exams work
        </span>
      </summary>
      <ol className="list-decimal space-y-1.5 border-t border-border/60 px-4 pb-4 pl-9 pt-3 text-muted-foreground">
        <li>
          <span className="text-foreground">Create draft</span> — class, term, papers, and maximum score.
        </li>
        <li>
          <span className="text-foreground">Open for marking</span> — teachers enter and submit marks per subject.
        </li>
        <li>
          <span className="text-foreground">Close exam</span> — when all subjects are submitted (or leadership agrees to
          force-close).
        </li>
        <li>
          <span className="text-foreground">Report cards</span> — link this exam when generating reports.
        </li>
        <li>
          <span className="text-foreground">Archive</span> when retired; permanent delete only for archived or unused
          drafts.
        </li>
      </ol>
    </details>
  );
}
