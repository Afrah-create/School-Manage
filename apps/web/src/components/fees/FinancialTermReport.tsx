"use client";

import type { Term } from "@uganda-cbc-sms/shared";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useFeeTermReport } from "@/hooks/useFees";
import { apiGet } from "@/lib/api";
import { formatUgx } from "@/lib/formatMoney";
import { queryStatus } from "@/lib/queryStatus";
import { toast } from "@/lib/toast";

export function FinancialTermReport() {
  const [termId, setTermId] = useState("");
  const termsQ = useQuery({
    queryKey: ["terms"],
    queryFn: () => apiGet<Term[]>("/academic/terms"),
  });
  const reportQ = useFeeTermReport(termId || undefined);
  const status = queryStatus(reportQ);

  const termOptions = useMemo(
    () => [
      { value: "", label: "Select a term" },
      ...(termsQ.data ?? []).map((t) => ({ value: t.id, label: `Term ${t.termNumber}` })),
    ],
    [termsQ.data],
  );

  const summary = reportQ.data?.summary;

  const exportCsv = () => {
    if (!reportQ.data?.invoices.length) return;
    const header = ["Student number", "Student name", "Billed", "Paid", "Balance", "Flagged"];
    const lines = reportQ.data.invoices.map((i) =>
      [
        i.studentNumber ?? "",
        i.studentName ?? "",
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
    <div className="space-y-6">
      <div className="max-w-md">
        <Select label="Term" options={termOptions} value={termId} onChange={(e) => setTermId(e.target.value)} />
      </div>
      {!termId ? (
        <Alert tone="info">Select a term to view billing and collection summary for that period.</Alert>
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
          {summary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card title="Total billed">
                  <p className="text-2xl font-semibold tabular-nums">{formatUgx(summary.billed)} UGX</p>
                </Card>
                <Card title="Collected">
                  <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatUgx(summary.collected)} UGX
                  </p>
                </Card>
                <Card title="Outstanding">
                  <p className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatUgx(summary.outstanding)} UGX
                  </p>
                </Card>
                <Card title="Invoices">
                  <p className="text-2xl font-semibold tabular-nums">{summary.invoiceCount}</p>
                  {summary.flaggedCount > 0 ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      {summary.flaggedCount} in arrears
                    </p>
                  ) : null}
                </Card>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-brand hover:underline"
                  onClick={exportCsv}
                  disabled={!reportQ.data?.invoices.length}
                >
                  Export CSV
                </button>
              </div>
              <Card title="Student invoices">
                <FeeInvoicesTable rows={reportQ.data?.invoices ?? []} emptyMessage="No invoices for this term." />
              </Card>
            </>
          ) : null}
        </AsyncContent>
      )}
    </div>
  );
}
