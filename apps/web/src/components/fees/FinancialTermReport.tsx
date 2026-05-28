"use client";

import type { AcademicYear, Term } from "@uganda-cbc-sms/shared";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { FeeCollectionCharts } from "@/components/fees/charts/FeeCollectionCharts";
import { BursarInvoiceFilters } from "@/components/fees/bursar/BursarInvoiceFilters";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Select } from "@/components/ui/Select";
import { useFeeTermReport } from "@/hooks/useFees";
import { apiGet } from "@/lib/api";
import {
  computeInvoiceStats,
  filterInvoices,
  type InvoiceBucket,
  uniqueInvoiceTerms,
} from "@/lib/feeFinanceStats";
import { queryStatus } from "@/lib/queryStatus";
import { toast } from "@/lib/toast";

export type FinancialTermReportProps = {
  /** Read-only for headteacher (no collect links). */
  readOnly?: boolean;
  studentBasePath?: string;
  invoiceBasePath?: string;
  title?: string;
  description?: string;
};

export function FinancialTermReport({
  readOnly = false,
  studentBasePath = "/bursar/students",
  invoiceBasePath = "/bursar/fees/invoices",
  title = "Term financial report",
  description = "Billing and collections for the selected term. Export for records or meetings.",
}: FinancialTermReportProps) {
  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<InvoiceBucket>("all");

  const yearsQ = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => apiGet<AcademicYear[]>("/academic/years"),
  });
  const termsQ = useQuery({
    queryKey: ["terms", yearId],
    queryFn: () => apiGet<Term[]>(`/academic/terms?academicYearId=${encodeURIComponent(yearId)}`),
    enabled: Boolean(yearId),
  });

  const reportQ = useFeeTermReport(termId || undefined);
  const status = queryStatus(reportQ);

  const invoices = reportQ.data?.invoices ?? [];
  const apiSummary = reportQ.data?.summary;
  const stats = useMemo(() => computeInvoiceStats(invoices), [invoices]);
  const termOptions = useMemo(() => uniqueInvoiceTerms(invoices), [invoices]);

  const filteredRows = useMemo(
    () => filterInvoices(invoices, { bucket, search }),
    [invoices, bucket, search],
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

  const yearOptions = useMemo(
    () => [
      { value: "", label: "Select academic year" },
      ...(yearsQ.data ?? []).map((y) => ({ value: y.id, label: y.name })),
    ],
    [yearsQ.data],
  );

  const termSelectOptions = useMemo(
    () => [
      { value: "", label: yearId ? "Select term" : "Select year first" },
      ...(termsQ.data ?? []).map((t) => ({ value: t.id, label: `Term ${t.termNumber}` })),
    ],
    [termsQ.data, yearId],
  );

  const collectionPct =
    stats.billedUgx > 0 ? Math.min(100, Math.round((stats.collectedOnInvoicesUgx / stats.billedUgx) * 100)) : 0;

  const exportCsv = () => {
    if (!invoices.length) return;
    const header = ["Student number", "Student name", "Billed", "Paid", "Balance", "Flagged"];
    const lines = invoices.map((i) =>
      [
        i.studentNumber ?? "",
        `"${(i.studentName ?? "").replace(/"/g, '""')}"`,
        i.totalAmount,
        i.amountPaid,
        i.balance,
        i.isFlagged ? "yes" : "no",
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fee-report-term-${termId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded as CSV.", "Export complete");
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select
            label="Academic year"
            options={yearOptions}
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setTermId("");
            }}
          />
          <Select
            label="Term"
            options={termSelectOptions}
            value={termId}
            disabled={!yearId}
            onChange={(e) => setTermId(e.target.value)}
          />
        </div>
      </section>

      {!termId ? (
        <Alert tone="info">Select an academic year and term to load the financial report.</Alert>
      ) : (
        <AsyncContent
          status={status}
          loading={<FormSkeleton fields={4} />}
          error={
            <ErrorState
              message={reportQ.error instanceof Error ? reportQ.error.message : "Could not load report."}
              onRetry={() => void reportQ.refetch()}
            />
          }
        >
          {apiSummary ? (
            <>
              <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="grid lg:grid-cols-[1.35fr_1fr]">
                  <div className="border-b border-border bg-gradient-to-br from-brand/8 to-transparent p-6 lg:border-b-0 lg:border-r">
                    <p className="text-sm font-medium text-muted-foreground">Outstanding this term</p>
                    <div className="mt-2">
                      <MoneyAmount amount={stats.outstandingUgx} compact size="hero" tone="warning" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {collectionPct}% collected · {stats.total} invoice{stats.total === 1 ? "" : "s"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" className="gap-2" onClick={exportCsv} disabled={!invoices.length}>
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-border">
                    <div className="bg-card p-4">
                      <p className="text-xs text-muted-foreground">Total billed</p>
                      <div className="mt-1">
                        <MoneyAmount amount={stats.billedUgx} compact size="lg" />
                      </div>
                    </div>
                    <div className="bg-card p-4">
                      <p className="text-xs text-muted-foreground">Collected</p>
                      <div className="mt-1">
                        <MoneyAmount amount={stats.collectedOnInvoicesUgx} compact size="lg" tone="positive" />
                      </div>
                    </div>
                    <div className="bg-card p-4">
                      <p className="text-xs text-muted-foreground">Active bills</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.active}</p>
                    </div>
                    <div className="bg-card p-4">
                      <p className="text-xs text-muted-foreground">Arrears</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                        {stats.arrears}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <FeeCollectionCharts stats={stats} />

              {stats.arrears > 0 ? (
                <Alert tone="info">
                  <strong>{stats.arrears}</strong> invoice{stats.arrears === 1 ? "" : "s"} flagged for arrears this
                  term. Use the <strong>Arrears</strong> filter below to review.
                </Alert>
              ) : null}

              <section className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-base font-semibold text-foreground">Student invoices</h3>
                  <p className="text-sm text-muted-foreground">
                    {readOnly ? "View-only — contact the bursar to record payments." : "Filter and export student-level detail."}
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <BursarInvoiceFilters
                    search={search}
                    onSearchChange={setSearch}
                    bucket={bucket}
                    onBucketChange={setBucket}
                    termId=""
                    onTermIdChange={() => {}}
                    termOptions={termOptions}
                    counts={bucketCounts}
                    hideTermFilter
                  />
                  <div className="mt-4 overflow-x-auto">
                    <FeeInvoicesTable
                      rows={filteredRows}
                      studentBasePath={studentBasePath}
                      invoiceBasePath={invoiceBasePath}
                      showCollectAction={!readOnly}
                      emptyMessage="No invoices match your filters for this term."
                    />
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </AsyncContent>
      )}
    </div>
  );
}
