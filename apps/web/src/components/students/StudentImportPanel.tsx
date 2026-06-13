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

  return (
    <Card title="Bulk CSV enrolment">
      <p className="mb-4 text-sm text-muted-foreground">
        Upload a CSV with columns: fullName, dateOfBirth, gender, className, classStream, guardianName,
        guardianContact, and optional guardianEmail, address, previousSchool. Classes must exist in the
        active academic year.
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
            Created {result.created}; skipped {result.skipped}.
          </Alert>
          {result.errors.length ? (
            <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 text-xs">
              {result.errors.map((err, idx) => (
                <div key={`${err.row}-${idx}`}>
                  Row {err.row} ({err.field}): {err.message}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
