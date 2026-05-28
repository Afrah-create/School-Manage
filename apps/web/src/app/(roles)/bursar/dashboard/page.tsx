"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { CreditCard, FileDown, Receipt, Users } from "lucide-react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import {
  DashboardHeader,
  DashboardPanel,
  DashboardSkeleton,
  DashboardTwoColumn,
  KpiGrid,
} from "@/components/layout/shells/DashboardScaffold";
import type { FeePayment } from "@uganda-cbc-sms/shared";
import { apiGet } from "@/lib/api";
import { useFeeInvoices } from "@/hooks/useFees";
import { formatUgx } from "@/lib/formatMoney";
import { combineQueryStatus } from "@/lib/queryStatus";

type Kpis = { activeStudents: string; totalFeesDue: string; totalFeesPaid: string };

const QUICK_LINKS = [
  { href: "/bursar/students", label: "Find student", icon: Users },
  { href: "/bursar/fees/payments", label: "Record payment", icon: CreditCard },
  { href: "/bursar/fees/invoices", label: "Invoices", icon: Receipt },
  { href: "/bursar/fees/schedules", label: "Fee schedules", icon: FileDown },
  { href: "/bursar/fees/reports", label: "Financial reports", icon: FileDown },
];

export default function BursarDashboardPage() {
  const [kpisQ, paymentsQ] = useQueries({
    queries: [
      { queryKey: ["dashboard-kpis"], queryFn: () => apiGet<Kpis>("/analytics/dashboard") },
      { queryKey: ["fees", "payments", "all"], queryFn: () => apiGet<FeePayment[]>("/fees/payments") },
    ],
  });
  const invoicesQ = useFeeInvoices();

  const queries = [kpisQ, paymentsQ, invoicesQ];
  const status = combineQueryStatus(queries);
  const isFetching = queries.some((q) => q.isFetching && !q.isPending);
  const errorMessage =
    (kpisQ.error ?? paymentsQ.error ?? invoicesQ.error) instanceof Error
      ? (kpisQ.error ?? paymentsQ.error ?? invoicesQ.error)!.message
      : "Failed to load dashboard";

  const kpis = kpisQ.data;
  const flagged = useMemo(
    () => (invoicesQ.data ?? []).filter((r) => r.isFlagged && Number(r.balance) > 0).length,
    [invoicesQ.data],
  );

  const recentPayments = useMemo(() => (paymentsQ.data ?? []).slice(0, 8), [paymentsQ.data]);

  const metrics = kpis
    ? [
        {
          label: "Fees due (UGX)",
          value: formatUgx(kpis.totalFeesDue),
          delta: "On all invoices",
          deltaTone: "neutral" as const,
        },
        {
          label: "Fees collected (UGX)",
          value: formatUgx(kpis.totalFeesPaid),
          delta: "Recorded payments",
          deltaTone: "positive" as const,
        },
        {
          label: "Flagged arrears",
          value: String(flagged),
          delta: flagged > 0 ? "Review needed" : "All clear",
          deltaTone: flagged > 0 ? ("negative" as const) : ("positive" as const),
        },
        {
          label: "Collection gap (UGX)",
          value: formatUgx(Math.max(0, Number(kpis.totalFeesDue) - Number(kpis.totalFeesPaid))),
          delta: "Outstanding",
          deltaTone: "neutral" as const,
        },
      ]
    : [];

  const exportRecentCsv = () => {
    if (!recentPayments.length) return;
    const header = ["Receipt", "Student", "Amount", "Method", "Paid at"];
    const lines = recentPayments.map((p) =>
      [p.receiptNumber, p.studentName ?? "", p.amount, p.method, p.paidAt].join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recent-payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Bursar dashboard"
        description="Collections, billing, and student fee accounts."
      />
      <AsyncContent
        status={status}
        isFetching={isFetching}
        loading={<DashboardSkeleton />}
        error={
          <ErrorState
            message={errorMessage}
            onRetry={() => void Promise.all(queries.map((q) => q.refetch()))}
          />
        }
      >
        <KpiGrid metrics={metrics} />
        <DashboardTwoColumn
          primary={
            <DashboardPanel title="Recent payments">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Link className="text-xs font-medium text-brand hover:underline" href="/bursar/fees/payments/history">
                  View all
                </Link>
                <button
                  type="button"
                  className="transition-ui inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50"
                  onClick={exportRecentCsv}
                  disabled={!recentPayments.length}
                >
                  <FileDown className="h-4 w-4 stroke-[1.5]" />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Receipt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Student
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.length ? (
                      recentPayments.map((p) => (
                        <tr
                          key={p.id}
                          className="transition-ui border-t border-border/50 hover:bg-muted/40"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{p.receiptNumber}</td>
                          <td className="px-4 py-3">
                            <Link className="text-brand hover:underline" href={`/bursar/students/${p.studentId}`}>
                              {p.studentName ?? "—"}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                            {formatUgx(p.amount)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                            {p.paidAt
                              ? new Date(p.paidAt).toLocaleDateString(undefined, { dateStyle: "medium" })
                              : "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-0">
                          <EmptyState
                            title="No payments recorded yet"
                            description="Payments you record will appear here for quick review."
                            icon={CreditCard}
                            action={{ label: "Record payment", href: "/bursar/fees/payments" }}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>
          }
          secondary={
            <DashboardPanel title="Quick actions">
              <ul className="space-y-2">
                {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-ui hover:bg-accent/50"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Fee structures are configured by administrators. Use{" "}
                <strong>Bill class</strong> on the invoices page to generate term invoices from those rates.
              </p>
            </DashboardPanel>
          }
        />
      </AsyncContent>
    </div>
  );
}
