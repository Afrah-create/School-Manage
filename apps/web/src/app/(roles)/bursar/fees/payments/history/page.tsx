"use client";

import { useMemo, useState } from "react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { FeePaymentsTable } from "@/components/fees/FeePaymentsTable";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useFeePayments } from "@/hooks/useFees";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { queryStatus } from "@/lib/queryStatus";

export default function BursarPaymentHistoryPage() {
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Payments shown">
          <p className="text-2xl font-semibold tabular-nums">{filtered.length}</p>
        </Card>
        <Card title="Total collected">
          <MoneyAmount amount={totalCollected} compact size="lg" tone="positive" />
        </Card>
      </div>

      <Card title="Payment history">
        <div className="mb-4 max-w-md">
          <Input
            label="Search"
            placeholder="Student, receipt number, or reference…"
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
          <FeePaymentsTable rows={filtered} emptyMessage="No payments match your search." />
        </AsyncContent>
      </Card>
    </div>
  );
}
