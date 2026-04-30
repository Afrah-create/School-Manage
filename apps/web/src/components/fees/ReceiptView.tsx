"use client";

import { Card } from "@/components/ui/Card";

export type PaymentReceipt = {
  receipt_number?: string;
  amount?: string | number;
  method?: string;
  transaction_ref?: string | null;
  paid_at?: string;
  student_id?: string;
};

export function ReceiptView({ payment }: { payment: PaymentReceipt }) {
  return (
    <Card title="Receipt">
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-slate-500">Receipt #</dt>
          <dd className="font-mono font-medium">{payment.receipt_number ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Amount (UGX)</dt>
          <dd>{String(payment.amount ?? "—")}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Method</dt>
          <dd>{payment.method ?? "—"}</dd>
        </div>
        {payment.transaction_ref ? (
          <div>
            <dt className="text-slate-500">Transaction ref</dt>
            <dd>{payment.transaction_ref}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500">Paid at</dt>
          <dd>{payment.paid_at ? String(payment.paid_at) : "—"}</dd>
        </div>
      </dl>
    </Card>
  );
}
