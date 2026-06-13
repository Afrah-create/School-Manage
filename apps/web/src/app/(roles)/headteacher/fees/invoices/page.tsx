"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { BursarInvoiceFilters } from "@/components/fees/bursar/BursarInvoiceFilters";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { Alert } from "@/components/ui/Alert";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { useFeeInvoices } from "@/hooks/useFees";
import {
  computeInvoiceStats,
  filterInvoices,
  type InvoiceBucket,
  uniqueInvoiceTerms,
} from "@/lib/feeFinanceStats";
import { queryStatus } from "@/lib/queryStatus";

function initialBucket(tab: string | null): InvoiceBucket {
  if (tab === "arrears") return "arrears";
  if (tab === "paid") return "paid";
  if (tab === "active") return "active";
  return "active";
}

export default function HeadteacherFeesInvoicesPage() {
  const searchParams = useSearchParams();
  const invoicesQ = useFeeInvoices();
  const status = queryStatus(invoicesQ);
  const allRows = useMemo(() => invoicesQ.data ?? [], [invoicesQ.data]);

  const [search, setSearch] = useState("");
  const [termId, setTermId] = useState("");
  const [bucket, setBucket] = useState<InvoiceBucket>(() => initialBucket(searchParams.get("tab")));

  const stats = useMemo(() => computeInvoiceStats(allRows), [allRows]);
  const termOptions = useMemo(() => uniqueInvoiceTerms(allRows), [allRows]);

  const filteredRows = useMemo(
    () => filterInvoices(allRows, { bucket, search, termId: termId || undefined }),
    [allRows, bucket, search, termId],
  );

  const bucketCounts = useMemo(
    () => ({
      active: stats.active,
      partial: stats.partial,
      arrears: stats.arrears,
      paid: stats.paid,
      all: stats.total,
    }),
    [stats],
  );

  return (
    <div className="space-y-6">
      <Alert tone="info">Browse school invoices and balances. Contact the bursar to record payments.</Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <div className="mt-1">
            <MoneyAmount amount={stats.outstandingUgx} compact size="lg" tone="warning" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Active bills</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Collected</p>
          <div className="mt-1">
            <MoneyAmount amount={stats.collectedOnInvoicesUgx} compact size="lg" tone="positive" />
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Invoices ({filteredRows.length} shown)
          </h2>
        </div>
        <div className="p-5">
          <BursarInvoiceFilters
            search={search}
            onSearchChange={setSearch}
            bucket={bucket}
            onBucketChange={setBucket}
            termId={termId}
            onTermIdChange={setTermId}
            termOptions={termOptions}
            counts={bucketCounts}
          />
          <div className="mt-4 overflow-x-auto">
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
                rows={filteredRows}
                studentBasePath="/headteacher/students"
                invoiceBasePath="/headteacher/fees/invoices"
                showCollectAction={false}
                emptyMessage="No invoices match your filters."
              />
            </AsyncContent>
          </div>
        </div>
      </section>
    </div>
  );
}
