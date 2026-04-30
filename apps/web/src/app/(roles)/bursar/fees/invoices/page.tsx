"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type Inv = { id: string; student_id?: string; balance?: string; total_amount?: string };

export default function BursarInvoicesListPage() {
  const [rows, setRows] = useState<Inv[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiGet<Inv[]>("/fees/invoices");
        setRows(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageWrapper title="Invoices" description="All fee invoices">
      {err ? <p className="text-red-600">{err}</p> : null}
      {loading ? <p className="text-slate-600">Loading…</p> : null}
      <Card title={`Total (${rows.length})`}>
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.id}>
              <Link className="text-brand underline" href={`/bursar/fees/invoices/${r.id}`}>
                {r.id.slice(0, 8)}…
              </Link>{" "}
              — balance {String(r.balance ?? "—")} UGX
            </li>
          ))}
        </ul>
      </Card>
    </PageWrapper>
  );
}
