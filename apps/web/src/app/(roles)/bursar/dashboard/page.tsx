"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type Kpis = {
  activeStudents: string;
  totalFeesDue: string;
  totalFeesPaid: string;
};

type PayRow = Record<string, unknown>;
type InvRow = Record<string, unknown>;

export default function BursarDashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [recent, setRecent] = useState<PayRow[]>([]);
  const [flagged, setFlagged] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [k, pay, inv] = await Promise.all([
          apiGet<Kpis>("/analytics/dashboard"),
          apiGet<PayRow[]>("/fees/payments"),
          apiGet<InvRow[]>("/fees/invoices"),
        ]);
        setKpis(k);
        setRecent(pay.slice(0, 5));
        setFlagged(inv.filter((r) => r.is_flagged === true || r["is_flagged"] === true).length);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageWrapper title="Dashboard" description="Finance overview">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-lg bg-slate-200" />
          <div className="h-40 rounded-lg bg-slate-200" />
        </div>
      ) : null}
      {err ? (
        <Card title="Error">
          <p className="text-red-600">{err}</p>
        </Card>
      ) : null}
      {!loading && !err && kpis ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Fees due (UGX)">
              <p className="text-2xl font-bold text-brand">{kpis.totalFeesDue}</p>
            </Card>
            <Card title="Fees collected (UGX)">
              <p className="text-2xl font-bold text-brand">{kpis.totalFeesPaid}</p>
            </Card>
            <Card title="Flagged invoices">
              <p className="text-2xl font-bold text-brand">{flagged}</p>
            </Card>
          </div>

          <Card title="Recent payments (latest 5)">
            <pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(recent, null, 2)}</pre>
          </Card>
        </div>
      ) : null}
    </PageWrapper>
  );
}
