"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";

type Inv = Record<string, unknown>;

export default function AdminFeesOverviewPage() {
  const [studentId, setStudentId] = useState("");
  const [rows, setRows] = useState<Inv[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const url = studentId
          ? `/fees/invoices?studentId=${encodeURIComponent(studentId)}`
          : `/fees/invoices`;
        const data = await apiGet<Inv[]>(url);
        setRows(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  return (
    <PageWrapper title="Fees overview" description="Invoices across the school">
      <div className="mb-4 max-w-md">
        <Input
          label="Filter by student ID (optional)"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      </div>
      {err ? <p className="text-red-600">{err}</p> : null}
      {loading ? <p className="text-slate-600">Loading…</p> : null}
      <Card title="Invoices">
        <pre className="max-h-96 overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
      </Card>
    </PageWrapper>
  );
}
