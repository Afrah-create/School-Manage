"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Card } from "@/components/ui/Card";
import { useFeeInvoices } from "@/hooks/useFees";
import { formatUgx } from "@/lib/formatMoney";
import { queryStatus } from "@/lib/queryStatus";

export default function AdminFeesOverviewPage() {
  const invoicesQ = useFeeInvoices();
  const status = queryStatus(invoicesQ);
  const rows = useMemo(() => invoicesQ.data ?? [], [invoicesQ.data]);

  const stats = useMemo(() => {
    let outstanding = 0;
    let collected = 0;
    let flagged = 0;
    for (const r of rows) {
      outstanding += Number(r.balance);
      collected += Number(r.amountPaid);
      if (r.isFlagged && Number(r.balance) > 0) flagged += 1;
    }
    return { outstanding, collected, flagged, count: rows.length };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Outstanding">
          <p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {formatUgx(stats.outstanding)} UGX
          </p>
        </Card>
        <Card title="Collected">
          <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatUgx(stats.collected)} UGX
          </p>
        </Card>
        <Card title="Arrears flagged">
          <p className="text-2xl font-semibold tabular-nums">{stats.flagged}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.count} invoices</p>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Record payments in the{" "}
        <Link className="font-medium text-brand hover:underline" href="/bursar/fees/payments">
          bursar portal
        </Link>
        . Configure rates under{" "}
        <Link className="font-medium text-brand hover:underline" href="/admin/fees/publish">
          publish & bill
        </Link>
        {" "}
        and{" "}
        <Link className="font-medium text-brand hover:underline" href="/admin/fees/structure">
          fee structure
        </Link>
        .
      </p>

      <Card title={`School invoices (${rows.length})`}>
        <AsyncContent
          status={status}
          loading={<FormSkeleton fields={4} />}
          error={
            <ErrorState
              message={
                invoicesQ.error instanceof Error ? invoicesQ.error.message : "Could not load invoices."
              }
              onRetry={() => void invoicesQ.refetch()}
            />
          }
        >
          <FeeInvoicesTable
            rows={rows}
            invoiceBasePath="/bursar/fees/invoices"
            studentBasePath="/admin/students"
          />
        </AsyncContent>
      </Card>
    </div>
  );
}
