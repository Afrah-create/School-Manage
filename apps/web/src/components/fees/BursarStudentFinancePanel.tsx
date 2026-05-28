"use client";

import Link from "next/link";
import { PaymentForm } from "@/components/fees/PaymentForm";
import { FeeBalanceCard } from "@/components/fees/FeeBalanceCard";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { FeePaymentsTable } from "@/components/fees/FeePaymentsTable";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Card } from "@/components/ui/Card";
import { useFeeInvoices, useFeePayments } from "@/hooks/useFees";
import { queryStatus } from "@/lib/queryStatus";

export function BursarStudentFinancePanel({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName?: string;
}) {
  const invoicesQ = useFeeInvoices(studentId);
  const paymentsQ = useFeePayments(studentId);
  const invStatus = queryStatus(invoicesQ);
  const payStatus = queryStatus(paymentsQ);

  return (
    <div className="space-y-6">
      <FeeBalanceCard studentId={studentId} />
      <Card title="Record payment">
        <PaymentForm studentId={studentId} studentName={studentName} />
      </Card>
      <Card title="Invoices">
        <div className="mb-3 flex justify-end">
          <Link className="text-xs font-medium text-brand hover:underline" href="/bursar/fees/invoices">
            All invoices
          </Link>
        </div>
        <AsyncContent
          status={invStatus}
          loading={<FormSkeleton fields={3} />}
          error={
            <ErrorState
              message={
                invoicesQ.error instanceof Error ? invoicesQ.error.message : "Could not load invoices."
              }
              onRetry={() => void invoicesQ.refetch()}
            />
          }
        >
          <FeeInvoicesTable rows={invoicesQ.data ?? []} emptyMessage="No invoices for this student." />
        </AsyncContent>
      </Card>
      <Card title="Payment history">
        <AsyncContent
          status={payStatus}
          loading={<FormSkeleton fields={3} />}
          error={
            <ErrorState
              message={
                paymentsQ.error instanceof Error ? paymentsQ.error.message : "Could not load payments."
              }
              onRetry={() => void paymentsQ.refetch()}
            />
          }
        >
          <FeePaymentsTable rows={paymentsQ.data ?? []} emptyMessage="No payments for this student." />
        </AsyncContent>
      </Card>
    </div>
  );
}
