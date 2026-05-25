"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiGetBlob } from "@/lib/api";

export function ReportCardPreview({ reportId, label = "Open PDF" }: { reportId: string; label?: string }) {
  const [err, setErr] = useState<string | null>(null);

  const openPdf = async () => {
    setErr(null);
    try {
      const blob = await apiGetBlob(`/reports/${reportId}/pdf`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not open PDF");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" onClick={() => void openPdf()}>
        {label}
      </Button>
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
