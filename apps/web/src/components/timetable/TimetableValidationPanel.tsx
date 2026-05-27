"use client";

import type { TimetableValidateResult } from "@uganda-cbc-sms/shared";
import { Alert } from "@/components/ui/Alert";

export function TimetableValidationPanel({ report }: { report: TimetableValidateResult | null | undefined }) {
  if (!report) {
    return <p className="text-sm text-muted-foreground">Run validation to check clashes and coverage.</p>;
  }

  return (
    <div className="space-y-4">
      {report.canPublish ? (
        <Alert tone="success">No blocking errors. Timetable can be published.</Alert>
      ) : (
        <Alert tone="error">{report.errors.length} blocking error(s) must be fixed before publish.</Alert>
      )}

      {report.errors.length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">Errors</h4>
          <ul className="space-y-1 text-sm text-red-700 dark:text-red-400">
            {report.errors.map((e, i) => (
              <li key={`${e.code}-${i}`}>{e.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.warnings.length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">Warnings</h4>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
            {report.warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
