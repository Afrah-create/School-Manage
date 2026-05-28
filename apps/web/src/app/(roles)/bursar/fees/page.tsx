"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { useFeeInvoices } from "@/hooks/useFees";
import { formatUgx } from "@/lib/formatMoney";
import { queryStatus } from "@/lib/queryStatus";

export default function BursarFeesOverviewPage() {
  const invoicesQ = useFeeInvoices();
  const status = queryStatus(invoicesQ);
  const rows = invoicesQ.data ?? [];

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

  const arrears = useMemo(() => rows.filter((r) => r.isFlagged && Number(r.balance) > 0), [rows]);

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
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card title="Outstanding">
          <p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {formatUgx(stats.outstanding)} UGX
          </p>
        </Card>
        <Card title="Collected (on record)">
          <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatUgx(stats.collected)} UGX
          </p>
        </Card>
        <Card title="Arrears flagged">
          <p className="text-2xl font-semibold tabular-nums">{stats.flagged}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.count} invoices total</p>
        </Card>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link className="font-medium text-brand hover:underline" href="/bursar/fees/schedules">
          Fee schedules
        </Link>
        <Link className="font-medium text-brand hover:underline" href="/bursar/fees/invoices">
          Invoices
        </Link>
        <Link className="font-medium text-brand hover:underline" href="/bursar/fees/payments">
          Record payment
        </Link>
      </div>

      {arrears.length > 0 ? (
        <Card title="Students in arrears">
          <Alert tone="info">
            Invoices flagged when balance exceeds the school arrears threshold. Follow up with guardians.
          </Alert>
          <div className="mt-4">
            <FeeInvoicesTable rows={arrears} emptyMessage="No arrears." />
          </div>
        </Card>
      ) : (
        <Alert tone="success">No invoices are currently flagged for arrears.</Alert>
      )}
    </AsyncContent>
  );
}
