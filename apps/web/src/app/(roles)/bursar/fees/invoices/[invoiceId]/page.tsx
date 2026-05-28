"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PaymentForm } from "@/components/fees/PaymentForm";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useFeeInvoice } from "@/hooks/useFees";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { queryStatus } from "@/lib/queryStatus";

export default function BursarInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = String(params["invoiceId"]);
  const invoiceQ = useFeeInvoice(invoiceId);
  const status = queryStatus(invoiceQ);
  const inv = invoiceQ.data;
  const balance = Number(inv?.balance ?? 0);

  return (
    <div className="space-y-6">
      <Link className="text-sm text-brand hover:underline" href="/bursar/fees/invoices">
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
          <div className="space-y-6">
            <Card title="Invoice summary">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Student</dt>
                  <dd>
                    <Link
                      className="font-medium text-brand hover:underline"
                      href={`/bursar/students/${inv.studentId}`}
                    >
                      {inv.studentName ?? "Student"}
                    </Link>
                    {inv.studentNumber ? (
                      <span className="ml-2 text-muted-foreground">#{inv.studentNumber}</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Term</dt>
                  <dd>
                    {inv.termLabel}
                    {inv.yearName ? ` · ${inv.yearName}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total billed</dt>
                  <dd>
                    <MoneyAmount amount={inv.totalAmount} size="md" />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Amount paid</dt>
                  <dd>
                    <MoneyAmount amount={inv.amountPaid} size="md" tone="positive" />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Balance</dt>
                  <dd>
                    <MoneyAmount
                      amount={inv.balance}
                      size="md"
                      tone={balance > 0 ? "warning" : "positive"}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
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
            </Card>
            {balance > 0 ? (
              <Card title="Record payment">
                <PaymentForm
                  studentId={inv.studentId}
                  studentName={inv.studentName}
                  defaultInvoiceId={inv.id}
                  onSuccess={() => void invoiceQ.refetch()}
                />
              </Card>
            ) : (
              <Alert tone="success">This invoice is fully paid.</Alert>
            )}
          </div>
        ) : null}
      </AsyncContent>
    </div>
  );
}
