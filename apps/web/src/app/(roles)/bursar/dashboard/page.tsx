"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { BursarDashboardContent } from "@/components/bursar/BursarDashboardContent";
import { DashboardSkeleton } from "@/components/layout/shells/DashboardScaffold";
import type { FeePayment } from "@uganda-cbc-sms/shared";
import { apiGet } from "@/lib/api";
import { useFeeInvoices } from "@/hooks/useFees";
import { computeInvoiceStats, recentPayments } from "@/lib/feeFinanceStats";
import { combineQueryStatus } from "@/lib/queryStatus";

type Kpis = { activeStudents: string; totalFeesDue: string; totalFeesPaid: string };

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

  const invoiceStats = useMemo(
    () => computeInvoiceStats(invoicesQ.data ?? []),
    [invoicesQ.data],
  );

  const arrearsCount = invoiceStats.arrears;

  const recent = useMemo(
    () => recentPayments(paymentsQ.data ?? [], 8),
    [paymentsQ.data],
  );

  const exportRecentCsv = () => {
    if (!recent.length) return;
    const header = ["Receipt", "Student", "Amount", "Method", "Paid at"];
    const lines = recent.map((p) =>
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
      {kpisQ.data ? (
        <BursarDashboardContent
          kpis={kpisQ.data}
          arrearsCount={arrearsCount}
          activeBillsCount={invoiceStats.active}
          recentPayments={recent}
          onExportPayments={exportRecentCsv}
        />
      ) : null}
    </AsyncContent>
  );
}
