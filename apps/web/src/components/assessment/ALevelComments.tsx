"use client";

type Row = {
  studentId: string;
  studentName: string;
  classTeacherComment?: string | null;
  headteacherRemark?: string | null;
};

export function ALevelComments({
  rows,
  role,
  onSave,
}: {
  rows: Row[];
  role: string;
  onSave: (studentId: string, payload: { classTeacherComment?: string; headteacherRemark?: string }) => Promise<unknown>;
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
              <label className="mb-1 block text-xs text-muted-foreground">Headteacher remark</label>
              <textarea
                defaultValue={row.headteacherRemark ?? ""}
                className="w-full rounded border border-border bg-background px-2 py-2 text-sm"
                readOnly={role !== "headteacher"}
                onBlur={(e) =>
                  role === "headteacher"
                    ? void onSave(row.studentId, { headteacherRemark: e.target.value })
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
