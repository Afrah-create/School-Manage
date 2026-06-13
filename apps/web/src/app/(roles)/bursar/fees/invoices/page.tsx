"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { BulkInvoiceForm } from "@/components/fees/BulkInvoiceForm";
import { BursarFinanceStats } from "@/components/fees/bursar/BursarFinanceStats";
import { BursarInvoiceFilters } from "@/components/fees/bursar/BursarInvoiceFilters";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { InvoiceCreateForm } from "@/components/fees/InvoiceCreateForm";
import { Card } from "@/components/ui/Card";
import { useFeeInvoices } from "@/hooks/useFees";
import {
  computeInvoiceStats,
  filterInvoices,
  type InvoiceBucket,
  uniqueInvoiceTerms,
} from "@/lib/feeFinanceStats";
import { queryStatus } from "@/lib/queryStatus";

type MainTab = "invoices" | "create" | "bulk";

function initialBucket(tab: string | null): InvoiceBucket {
  if (tab === "arrears") return "arrears";
  if (tab === "paid") return "paid";
  if (tab === "all") return "all";
  return "active";
}

function initialMainTab(tab: string | null): MainTab {
  if (tab === "create") return "create";
  if (tab === "bulk") return "bulk";
  return "invoices";
}

export default function BursarInvoicesListPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const invoicesQ = useFeeInvoices();
  const status = queryStatus(invoicesQ);
  const allRows = useMemo(() => invoicesQ.data ?? [], [invoicesQ.data]);

  const [mainTab, setMainTab] = useState<MainTab>(() => initialMainTab(tabParam));
  const [search, setSearch] = useState("");
  const [termId, setTermId] = useState("");
  const [bucket, setBucket] = useState<InvoiceBucket>(() => initialBucket(tabParam));

  const stats = useMemo(() => computeInvoiceStats(allRows), [allRows]);
  const termOptions = useMemo(() => uniqueInvoiceTerms(allRows), [allRows]);

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

  const filteredRows = useMemo(
    () => filterInvoices(allRows, { bucket, search, termId: termId || undefined }),
    [allRows, bucket, search, termId],
  );

  const tabButtons: { key: MainTab; label: string; count?: number }[] = [
    { key: "invoices", label: "Track invoices", count: stats.active },
    { key: "create", label: "New invoice" },
    { key: "bulk", label: "Bill class" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabButtons.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-ui ${
              mainTab === key ? "bg-brand text-white" : "text-muted-foreground hover:bg-accent/50"
            }`}
            onClick={() => setMainTab(key)}
          >
            {label}
            {count !== undefined && key === "invoices" ? ` (${count} active)` : ""}
          </button>
        ))}
      </div>

      {mainTab === "create" ? (
        <Card title="Create invoice for one student">
          <InvoiceCreateForm onCreated={() => void invoicesQ.refetch()} />
        </Card>
      ) : mainTab === "bulk" ? (
        <Card title="Bill entire class from fee schedule">
          <BulkInvoiceForm onDone={() => void invoicesQ.refetch()} />
        </Card>
      ) : (
        <>
          <BursarFinanceStats stats={stats} variant="compact" />

          <Card title={`Showing ${filteredRows.length} invoice${filteredRows.length === 1 ? "" : "s"}`}>
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
            <div className="mt-4">
              <AsyncContent
                status={status}
                loading={<FormSkeleton fields={4} />}
                error={
                  <ErrorState
                    message={
                      invoicesQ.error instanceof Error
                        ? invoicesQ.error.message
                        : "Could not load invoices."
                    }
                    onRetry={() => void invoicesQ.refetch()}
                  />
                }
              >
                <FeeInvoicesTable
                  rows={filteredRows}
                  emptyMessage={
                    bucket === "active"
                      ? "No unpaid invoices for this filter."
                      : "No invoices match your filters."
                  }
                />
              </AsyncContent>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
