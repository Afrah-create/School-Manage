"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ReportCardPreview } from "@/components/reports/ReportCardPreview";
import { apiPatch, apiPost } from "@/lib/api";

export default function HeadteacherReportsPage() {
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [reportId, setReportId] = useState("");
  const [approveId, setApproveId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const genCbc = async () => {
    setErr(null);
    try {
      const r = await apiPost<{ reportIds: string[] }>("/reports/cbc/generate", { classId, termId });
      setMsg(`Generated ${r.reportIds.length} CBC reports`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  const genAl = async () => {
    setErr(null);
    try {
      const r = await apiPost<{ reportIds: string[] }>("/reports/alevel/generate", { classId, termId });
      setMsg(`Generated ${r.reportIds.length} A-Level reports`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  const approve = async () => {
    setErr(null);
    try {
      await apiPatch(`/reports/${encodeURIComponent(approveId)}/approve`, {});
      setMsg("Approved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <PageWrapper title="Report cards" description="Generate PDF report cards and approve">
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <Input label="Class ID" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <Input label="Term ID" value={termId} onChange={(e) => setTermId(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void genCbc()}>Generate CBC</Button>
        <Button variant="secondary" onClick={() => void genAl()}>
          Generate A-Level
        </Button>
      </div>
      {msg ? <p className="mt-4 text-emerald-700">{msg}</p> : null}
      {err ? <p className="mt-4 text-red-600">{err}</p> : null}

      <div className="mt-10 space-y-4">
        <Input label="Preview report ID (UUID)" value={reportId} onChange={(e) => setReportId(e.target.value)} />
        {reportId ? <ReportCardPreview reportId={reportId} /> : null}
      </div>

      <div className="mt-10 flex flex-wrap items-end gap-2">
        <Input label="Approve report ID" value={approveId} onChange={(e) => setApproveId(e.target.value)} />
        <Button onClick={() => void approve()}>Approve</Button>
      </div>
    </PageWrapper>
  );
}
