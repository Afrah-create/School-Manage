"use client";

import { Button } from "@/components/ui/Button";

type Row = {
  subject_id?: string;
  subject_name?: string;
  subject_code?: string;
  teacher_name?: string | null;
  status?: string;
};

export function AssessmentStatusOverview({
  rows,
  canUnlock,
  onUnlock,
}: {
  rows: Row[];
  canUnlock?: boolean;
  onUnlock?: (subjectId: string) => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted/40">
            <th className="px-2 py-2 text-left">Subject</th>
            <th className="px-2 py-2 text-left">Teacher</th>
            <th className="px-2 py-2 text-left">Status</th>
            <th className="px-2 py-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-border">
              <td className="px-2 py-2">{`${row.subject_code ?? ""} ${row.subject_name ?? ""}`.trim()}</td>
              <td className="px-2 py-2">{row.teacher_name ?? "-"}</td>
              <td className="px-2 py-2">{row.status ?? "Draft"}</td>
              <td className="px-2 py-2">
                {canUnlock && row.subject_id ? (
                  <Button variant="secondary" onClick={() => void onUnlock?.(row.subject_id!)}>
                    Unlock
                  </Button>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
