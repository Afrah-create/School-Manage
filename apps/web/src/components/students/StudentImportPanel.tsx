"use client";

import { useRef, useState } from "react";
import type { StudentImportResult } from "@uganda-cbc-sms/shared";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, apiUpload, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

export function StudentImportPanel({ onImported }: { onImported?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<StudentImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiUpload<StudentImportResult>("/students/import", form);
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Imported ${data.created} student(s).`, "Import complete");
      onImported?.();
    },
    onError: (error) => toast.error(getApiErrorMessage(error), "Import failed"),
  });

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/students/import/template", { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student-import-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not download template");
    }
  };

  const downloadErrors = () => {
    if (!result?.errors.length) return;
    const lines = [
      "row,field,message",
      ...result.errors.map((e) => `${e.row},${e.field},"${e.message.replace(/"/g, '""')}"`),
    ];
    const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card title="Bulk CSV enrolment">
      <p className="mb-4 text-sm text-muted-foreground">
        Upload a CSV with student details. Column names are flexible — e.g.{" "}
        <code className="text-xs">fullName</code>, <code className="text-xs">Full Name</code>, or{" "}
        <code className="text-xs">name</code>; <code className="text-xs">className</code> /{" "}
        <code className="text-xs">Class</code> and <code className="text-xs">classStream</code> /{" "}
        <code className="text-xs">Stream</code> (or combine as &quot;S1 Main&quot; in one class column). Classes
        must match the active academic year exactly (case-insensitive). Download the template for the safest format.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => void downloadTemplate()}>
          Download template
        </Button>
        <Button
          type="button"
          disabled={importMutation.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {importMutation.isPending ? "Importing…" : "Upload CSV"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importMutation.mutate(file);
            e.target.value = "";
          }}
        />
      </div>
      {result ? (
        <div className="mt-4 space-y-2">
          <Alert tone={result.errors.length ? "info" : "success"}>
            Imported {result.created} of {result.totalRows} row(s); {result.skipped} skipped.
          </Alert>
          {result.errors.length ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="!h-8 !px-3 text-xs" onClick={downloadErrors}>
                  Download error report
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-md border border-border p-2 text-xs">
                {result.errors.map((err, idx) => (
                  <div key={`${err.row}-${idx}`}>
                    Row {err.row} ({err.field}): {err.message}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
