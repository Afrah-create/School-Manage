"use client";

import { useMemo } from "react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { BursarCollectionsHub } from "@/components/fees/bursar/BursarCollectionsHub";
import { useFeeInvoices, useFeePayments } from "@/hooks/useFees";
import { computeInvoiceStats } from "@/lib/feeFinanceStats";
import { queryStatus } from "@/lib/queryStatus";

export default function BursarFeesOverviewPage() {
  const invoicesQ = useFeeInvoices();
  const paymentsQ = useFeePayments();
  const status = queryStatus(invoicesQ);

  const rows = useMemo(() => invoicesQ.data ?? [], [invoicesQ.data]);
  const stats = useMemo(() => computeInvoiceStats(rows), [rows]);

  return (
    <AsyncContent
      status={status}
      loading={<FormSkeleton fields={4} />}
      error={
        <ErrorState
          message={invoicesQ.error instanceof Error ? invoicesQ.error.message : "Could not load fees."}
          onRetry={() => void invoicesQ.refetch()}
        />
      }
    >
      <BursarCollectionsHub stats={stats} rows={rows} payments={paymentsQ.data ?? []} />
    </AsyncContent>
  );
}
