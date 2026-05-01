"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import {
  DashboardErrorState,
  DashboardHeader,
  DashboardPanel,
  DashboardSkeleton,
  DashboardTwoColumn,
  KpiGrid,
} from "@/components/layout/shells/DashboardScaffold";
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

  const metrics = kpis
    ? [
        { label: "Fees due (UGX)", value: kpis.totalFeesDue, delta: "Term total", deltaTone: "neutral" as const },
        { label: "Fees collected (UGX)", value: kpis.totalFeesPaid, delta: "+4.8%", deltaTone: "positive" as const },
        { label: "Flagged invoices", value: String(flagged), delta: flagged > 0 ? "Review needed" : "All clear", deltaTone: flagged > 0 ? ("negative" as const) : ("positive" as const) },
        { label: "Collection gap (UGX)", value: String(Math.max(0, Number(kpis.totalFeesDue) - Number(kpis.totalFeesPaid))), delta: "Outstanding", deltaTone: "neutral" as const },
      ]
    : [];

  const normalizedRecent = recent.map((row, index) => {
    // STYLE: payment APIs currently return loosely shaped objects; normalize in-view without touching service/business logic.
    const amount = Number(row["amount"] ?? row["paid_amount"] ?? 0);
    const method = String(row["method"] ?? row["payment_method"] ?? "N/A");
    const createdAt = String(row["created_at"] ?? row["createdAt"] ?? "");
    const status = String(row["status"] ?? "completed").toLowerCase();
    return {
      id: String(row["id"] ?? `payment-${index}`),
      amount,
      method,
      createdAt,
      status,
    };
  });

  return (
    <div className="space-y-6">
      <DashboardHeader title="Bursar Dashboard" description="Financial health, collections, and payment operations." />
      {loading ? <DashboardSkeleton /> : null}
      {err ? <DashboardErrorState message={err} onRetry={() => window.location.reload()} /> : null}
      {!loading && !err && kpis ? (
        <>
          <KpiGrid metrics={metrics} />
          <DashboardTwoColumn
            primary={
              <DashboardPanel title="Recent payments (latest 5)">
                <div className="mb-3 flex items-center justify-end">
                  <button type="button" className="transition-ui inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50">
                    <FileDown className="h-4 w-4 stroke-[1.5]" />
                    Export
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Method</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedRecent.length ? (
                        normalizedRecent.map((payment) => (
                          <tr key={payment.id} className="transition-ui border-t border-border/50 hover:bg-muted/40 dark:hover:bg-muted/30">
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{payment.method}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {payment.amount.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                              {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                payment.status === "pending"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : payment.status === "failed"
                                    ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                    : "bg-green-500/10 text-green-700 dark:text-green-400"
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </DashboardPanel>
            }
            secondary={
              <DashboardPanel title="Finance actions">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Record new payments and track invoice exceptions from the fees module.</p>
                </div>
              </DashboardPanel>
            }
          />
        </>
      ) : null}
    </div>
  );
}
