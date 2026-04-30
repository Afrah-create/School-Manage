"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type Kpis = {
  activeStudents: string;
  totalFeesDue: string;
  totalFeesPaid: string;
};

type TermRow = {
  id: string;
  termNumber?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

type InvRow = Record<string, unknown>;

export default function HeadteacherDashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [flagged, setFlagged] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [k, t, inv] = await Promise.all([
          apiGet<Kpis>("/analytics/dashboard"),
          apiGet<TermRow[]>("/academic/terms"),
          apiGet<InvRow[]>("/fees/invoices"),
        ]);
        setKpis(k);
        setTerms(t);
        setFlagged(inv.filter((r) => r.is_flagged === true || r["is_flagged"] === true).length);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeTerms = terms.filter((x) => x.isActive);
  const current = activeTerms[0];

  const daysRemaining = (() => {
    if (!current?.endDate) return null;
    const end = new Date(String(current.endDate)).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (86400 * 1000)));
  })();

  return (
    <PageWrapper title="Dashboard" description="School-wide overview">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card title="Active students">
              <p className="text-3xl font-bold text-brand">{kpis.activeStudents}</p>
            </Card>
            <Card title="Fees collected / due">
              <p className="text-lg font-semibold">{kpis.totalFeesPaid}</p>
              <p className="text-xs text-slate-500">Due {kpis.totalFeesDue} UGX</p>
            </Card>
            <Card title="Current term">
              <p className="font-medium">{current ? `Term ${current.termNumber ?? "?"}` : "—"}</p>
              {daysRemaining !== null ? (
                <p className="text-xs text-slate-500">{daysRemaining} days remaining (approx.)</p>
              ) : (
                <p className="text-xs text-slate-500">Set an active term in Academic.</p>
              )}
            </Card>
            <Card title="Flagged invoices">
              <p className="text-3xl font-bold text-brand">{flagged}</p>
              <Link className="text-xs text-brand underline" href="/headteacher/reports">
                Review finances / reports
              </Link>
            </Card>
          </div>

          <Card title="Report cards pending approval">
            <p className="text-sm text-slate-600">
              Requires backend support: <code className="rounded bg-slate-100 px-1">GET /api/reports?status=pending</code>{" "}
              is not exposed yet. Use Reports → approve by ID once generated.
            </p>
          </Card>
        </div>
      ) : null}
    </PageWrapper>
  );
}
