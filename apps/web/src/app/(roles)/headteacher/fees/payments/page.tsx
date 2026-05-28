"use client";

import { useMemo, useState } from "react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { FeePaymentsTable } from "@/components/fees/FeePaymentsTable";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { useFeePayments } from "@/hooks/useFees";
import { queryStatus } from "@/lib/queryStatus";

export default function HeadteacherFeesPaymentsPage() {
  const paymentsQ = useFeePayments();
  const status = queryStatus(paymentsQ);
  const [search, setSearch] = useState("");

  const allRows = paymentsQ.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((p) => {
      const hay = [p.studentName, p.studentNumber, p.receiptNumber, p.transactionRef]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allRows, search]);

  const totalCollected = useMemo(
    () => filtered.reduce((s, p) => s + Number(p.amount), 0),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <Alert tone="info">Payment records are created by the bursar. This view is read-only for oversight.</Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payments shown</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total collected</p>
          <div className="mt-1">
            <MoneyAmount amount={totalCollected} compact size="lg" tone="positive" />
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">All payments</h2>
          <p className="text-sm text-muted-foreground">Search by student, receipt number, or reference.</p>
        </div>
        <div className="p-5">
          <div className="mb-4 max-w-md">
            <Input
              label="Search"
              placeholder="Student, receipt, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <AsyncContent
            status={status}
            loading={<FormSkeleton fields={4} />}
            error={
              <ErrorState
                message={paymentsQ.error instanceof Error ? paymentsQ.error.message : "Could not load payments."}
                onRetry={() => void paymentsQ.refetch()}
              />
            }
          >
            <FeePaymentsTable
              rows={filtered}
              studentBasePath="/headteacher/students"
              emptyMessage="No payments match your search."
            />
          </AsyncContent>
        </div>
      </section>
    </div>
  );
}
