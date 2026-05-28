"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { useFeeInvoice } from "@/hooks/useFees";
import { queryStatus } from "@/lib/queryStatus";

export default function HeadteacherInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = String(params["invoiceId"]);
  const invoiceQ = useFeeInvoice(invoiceId);
  const status = queryStatus(invoiceQ);
  const inv = invoiceQ.data;
  const balance = Number(inv?.balance ?? 0);

  return (
    <div className="space-y-6">
      <Link className="text-sm text-brand hover:underline" href="/headteacher/fees/invoices">
        ← Back to invoices
      </Link>
      <AsyncContent
        status={status}
        loading={<FormSkeleton fields={5} />}
        error={
          <ErrorState
            message={invoiceQ.error instanceof Error ? invoiceQ.error.message : "Could not load invoice."}
            onRetry={() => void invoiceQ.refetch()}
          />
        }
      >
        {inv ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/30 px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">Invoice detail</h2>
              <p className="text-sm text-muted-foreground">Read-only view for oversight</p>
            </div>
            <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Student</dt>
                <dd className="mt-1">
                  <Link className="font-medium text-brand hover:underline" href={`/headteacher/students/${inv.studentId}`}>
                    {inv.studentName ?? "Student"}
                  </Link>
                  {inv.studentNumber ? (
                    <span className="ml-2 text-muted-foreground">#{inv.studentNumber}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Term</dt>
                <dd className="mt-1">
                  {inv.termLabel}
                  {inv.yearName ? ` · ${inv.yearName}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total billed</dt>
                <dd className="mt-1">
                  <MoneyAmount amount={inv.totalAmount} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount paid</dt>
                <dd className="mt-1">
                  <MoneyAmount amount={inv.amountPaid} tone="positive" />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Balance</dt>
                <dd className="mt-1">
                  <MoneyAmount amount={inv.balance} tone={balance > 0 ? "warning" : "positive"} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  {balance <= 0 ? (
                    <Badge tone="success">Paid in full</Badge>
                  ) : inv.isFlagged ? (
                    <Badge tone="warning">Arrears</Badge>
                  ) : (
                    <Badge tone="neutral">Outstanding</Badge>
                  )}
                </dd>
              </div>
            </dl>
            {balance > 0 ? (
              <div className="border-t border-border px-5 py-4">
                <Alert tone="info">
                  Outstanding balance — ask the bursar to record a payment when the guardian pays.
                </Alert>
              </div>
            ) : (
              <div className="border-t border-border px-5 py-4">
                <Alert tone="success">This invoice is fully paid.</Alert>
              </div>
            )}
          </div>
        ) : null}
      </AsyncContent>
    </div>
  );
}
