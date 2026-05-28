"use client";

import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { FeePaymentsTable } from "@/components/fees/FeePaymentsTable";
import { Card } from "@/components/ui/Card";
import { useFeePayments } from "@/hooks/useFees";
import { queryStatus } from "@/lib/queryStatus";

export default function BursarPaymentHistoryPage() {
  const paymentsQ = useFeePayments();
  const status = queryStatus(paymentsQ);

  return (
    <Card title={`Payments (${paymentsQ.data?.length ?? 0})`}>
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
        <FeePaymentsTable rows={paymentsQ.data ?? []} />
      </AsyncContent>
    </Card>
  );
}
