"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import {
  CreditCard,
  FileBarChart2,
  FileText,
  Receipt,
  Users,
} from "lucide-react";
import type { FeePayment } from "@uganda-cbc-sms/shared";
import { BursarRecentPayments } from "@/components/fees/bursar/BursarRecentPayments";
import { DashboardQuickAccess } from "@/components/dashboard/DashboardQuickAccess";
import { Button } from "@/components/ui/Button";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { DashboardHeader, KpiGrid } from "@/components/layout/shells/DashboardScaffold";
import type { DashboardMetric } from "@/components/layout/shells/types";
import { formatUgx } from "@/lib/formatMoney";
import { parseMoneyAmount } from "@/lib/formatMoney";

type Kpis = {
  activeStudents: string;
  totalFeesDue: string;
  totalFeesPaid: string;
};

const QUICK_GROUPS = [
  {
    title: "Collections",
    links: [
      { href: "/bursar/fees", label: "Collections hub", description: "Active bills and overview", icon: Receipt },
      { href: "/bursar/fees/payments", label: "Record payment", description: "Cash or mobile money", icon: CreditCard },
      { href: "/bursar/fees/invoices?tab=active", label: "Active bills", description: "Unpaid invoices", icon: Receipt },
    ],
  },
  {
    title: "Billing",
    links: [
      { href: "/bursar/fees/invoices?tab=bulk", label: "Bill a class", description: "Term invoices from schedule", icon: FileText },
      { href: "/bursar/fees/schedules", label: "Fee schedules", description: "Published admin rates", icon: FileBarChart2 },
      { href: "/bursar/fees/invoices", label: "All invoices", description: "Search and filter", icon: Receipt },
    ],
  },
  {
    title: "Students & reports",
    links: [
      { href: "/bursar/students", label: "Find student", description: "Balances and history", icon: Users },
      { href: "/bursar/fees/payments/history", label: "Payment history", description: "All receipts", icon: CreditCard },
      { href: "/bursar/fees/reports", label: "Term reports", description: "Collection by term", icon: FileBarChart2 },
    ],
  },
];

export function BursarDashboardContent({
  kpis,
  arrearsCount,
  activeBillsCount,
  recentPayments,
  onExportPayments,
}: {
  kpis: Kpis;
  arrearsCount: number;
  activeBillsCount: number;
  recentPayments: FeePayment[];
  onExportPayments: () => void;
}) {
  const feesDue = parseMoneyAmount(kpis.totalFeesDue);
  const feesPaid = parseMoneyAmount(kpis.totalFeesPaid);
  const feesGap = Math.max(0, feesDue - feesPaid);
  const collectionPct = feesDue > 0 ? Math.min(100, Math.round((feesPaid / feesDue) * 100)) : 0;

  const metrics: DashboardMetric[] = [
    {
      label: "Outstanding",
      value: formatUgx(feesGap, { compact: true }),
      helper: "UGX to collect",
      delta: `${activeBillsCount} active bills`,
      deltaTone: activeBillsCount > 0 ? "neutral" : "positive",
    },
    {
      label: "Collected",
      value: formatUgx(feesPaid, { compact: true }),
      delta: "Recorded payments",
      deltaTone: "positive",
    },
    {
      label: "Flagged arrears",
      value: String(arrearsCount),
      delta: arrearsCount > 0 ? "Follow up" : "All clear",
      deltaTone: arrearsCount > 0 ? "negative" : "positive",
    },
    {
      label: "Collection rate",
      value: feesDue > 0 ? `${collectionPct}%` : "—",
      delta: `${kpis.activeStudents} students`,
      deltaTone: collectionPct >= 70 ? "positive" : "neutral",
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Bursar dashboard"
        description="Daily collections, billing, and student fee accounts."
        actions={
          <Link href="/bursar/fees/payments">
            <Button>Record payment</Button>
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To collect</p>
          <div className="mt-2">
            <MoneyAmount amount={feesGap} compact size="hero" tone="warning" />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeBillsCount} active bill{activeBillsCount === 1 ? "" : "s"} · {collectionPct}% collected overall
          </p>
          <Link href="/bursar/fees" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            Open collections hub →
          </Link>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Needs attention</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-800 dark:text-amber-300">
              {arrearsCount}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Invoices flagged for arrears</p>
          </div>
          <Link
            href="/bursar/fees/invoices?tab=arrears"
            className="mt-4 text-sm font-medium text-brand hover:underline"
          >
            Review arrears →
          </Link>
        </div>
      </section>

      <KpiGrid metrics={metrics} />

      <DashboardQuickAccess groups={QUICK_GROUPS} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent payments</h2>
              <p className="text-sm text-muted-foreground">Latest receipts you recorded.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="gap-2 text-sm"
                onClick={onExportPayments}
                disabled={!recentPayments.length}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Link href="/bursar/fees/payments/history" className="text-sm font-medium text-brand hover:underline self-center">
                View all
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Receipt
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Student
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length ? (
                  recentPayments.slice(0, 10).map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{p.receiptNumber}</td>
                      <td className="px-3 py-3">
                        <Link className="font-medium text-brand hover:underline" href={`/bursar/students/${p.studentId}`}>
                          {p.studentName ?? "—"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <MoneyAmount amount={p.amount} size="sm" tone="positive" />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Quick collect</h2>
          <p className="mb-4 text-sm text-muted-foreground">Jump straight to recording a payment.</p>
          <BursarRecentPayments rows={recentPayments} limit={6} />
        </aside>
      </section>
    </div>
  );
}
