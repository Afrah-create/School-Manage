"use client";

import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { useFeeBalance } from "@/hooks/useFees";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { queryStatus } from "@/lib/queryStatus";

export function FeeBalanceCard({ studentId }: { studentId: string }) {
  const balanceQ = useFeeBalance(studentId);
  const status = queryStatus(balanceQ);
  const balance = Number(balanceQ.data?.totalBalance ?? 0);

  return (
    <Card title="Fee balance">
      <AsyncContent
        status={status}
        loading={<p className="text-sm text-muted-foreground">Loading balance…</p>}
        error={
          <ErrorState
            message={
              balanceQ.error instanceof Error ? balanceQ.error.message : "Could not load balance."
            }
            onRetry={() => void balanceQ.refetch()}
          />
        }
      >
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total outstanding</p>
          <MoneyAmount
            amount={balanceQ.data?.totalBalance}
            compact
            size="hero"
            tone={balance > 0 ? "warning" : "positive"}
          />
          {balance > 0 ? (
            <Alert tone="info">Outstanding fees across all term invoices for this student.</Alert>
          ) : (
            <p className="text-sm text-muted-foreground">No outstanding balance on record.</p>
          )}
        </div>
      </AsyncContent>
    </Card>
  );
}
