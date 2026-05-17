"use client";

import { Button } from "@/components/ui/Button";

type Row = {
  studentId: string;
  studentName: string;
  classTeacherComment?: string | null;
  headteacherComment?: string | null;
};

export function CBCComments({
  rows,
  role,
  onSave,
}: {
  rows: Row[];
  role: string;
  onSave: (studentId: string, payload: { classTeacherComment?: string; headteacherComment?: string }) => Promise<unknown>;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.studentId} className="rounded border border-border p-3">
          <p className="mb-2 text-sm font-semibold">{row.studentName}</p>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Class teacher comment</label>
              <textarea
                defaultValue={row.classTeacherComment ?? ""}
                className="w-full rounded border border-border bg-background px-2 py-2 text-sm"
                readOnly={role !== "class_teacher"}
                onBlur={(e) =>
                  role === "class_teacher"
                    ? void onSave(row.studentId, { classTeacherComment: e.target.value })
                    : undefined
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Headteacher comment</label>
              <textarea
                defaultValue={row.headteacherComment ?? ""}
                className="w-full rounded border border-border bg-background px-2 py-2 text-sm"
                readOnly={role !== "headteacher"}
                onBlur={(e) =>
                  role === "headteacher"
                    ? void onSave(row.studentId, { headteacherComment: e.target.value })
                    : undefined
                }
              />
            </div>
          </div>
          {role === "class_teacher" || role === "headteacher" ? (
            <div className="mt-2">
              <Button variant="ghost" disabled>
                Auto-save on blur
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
