"use client";

const FULL_STEPS = [
  { n: 1, title: "Term assessments", hint: "All subject teachers submit term marks" },
  { n: 2, title: "Close formal exam", hint: "Exam closed; every subject submitted" },
  { n: 3, title: "Release report cards", hint: "Generate snapshots and approve PDFs" },
  { n: 4, title: "Archive exam", hint: "Retire exam when reports are issued" },
] as const;

const TERM_ONLY_STEPS = [
  { n: 1, title: "Term assessments", hint: "All subject teachers submit term marks in Assessment" },
  { n: 2, title: "Release report cards", hint: "Generate snapshots and approve PDFs" },
] as const;

export function ReportReleaseSteps({
  termReady,
  examReady,
  hasGenerated,
  termOnlyNoExam,
}: {
  termReady: boolean;
  examReady?: boolean;
  hasGenerated?: boolean;
  /** No active formal exam for this class/term — hide exam lifecycle steps. */
  termOnlyNoExam?: boolean;
}) {
  if (termOnlyNoExam) {
    return (
      <ol className="grid gap-3 sm:grid-cols-2">
        {TERM_ONLY_STEPS.map((step) => {
          const done = step.n === 1 ? termReady : hasGenerated;
          const active = step.n === 1 ? !termReady : termReady && !hasGenerated;
          return (
            <li
              key={step.n}
              className={`rounded-lg border p-3 text-sm ${
                done
                  ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30"
                  : active
                    ? "border-brand/40 bg-brand/5"
                    : "border-border bg-card"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step {step.n}
              </p>
              <p className="mt-1 font-medium text-foreground">{step.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.hint}</p>
            </li>
          );
        })}
      </ol>
    );
  }

  const step2Done = Boolean(examReady);
  const step3Done = Boolean(hasGenerated);

  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {FULL_STEPS.map((step) => {
        let done = false;
        let active = false;
        if (step.n === 1) {
          done = termReady;
          active = !termReady;
        } else if (step.n === 2) {
          done = step2Done;
          active = termReady && !step2Done;
        } else if (step.n === 3) {
          done = step3Done;
          active = step2Done && !step3Done;
        } else if (step.n === 4) {
          done = false;
          active = step3Done;
        }
        return (
          <li
            key={step.n}
            className={`rounded-lg border p-3 text-sm ${
              done
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : active
                  ? "border-brand/40 bg-brand/5"
                  : "border-border bg-muted/20"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step {step.n}
            </p>
            <p className="mt-1 font-medium text-foreground">{step.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{step.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
