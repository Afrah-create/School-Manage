"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PaymentForm } from "@/components/fees/PaymentForm";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type Inv = {
  id: string;
  student_id: string;
  term_id?: string;
  total_amount?: string;
  amount_paid?: string;
  balance?: string;
};

export default function BursarInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = String(params["invoiceId"] ?? "");
  const [invoice, setInvoice] = useState<Inv | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await apiGet<Inv[]>("/fees/invoices");
        const found = rows.find((r) => r.id === invoiceId) ?? null;
        setInvoice(found);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  return (
    <PageWrapper title="Invoice detail" description="Record payments against this invoice">
      {loading ? <p className="text-slate-600">Loading…</p> : null}
      {err ? <p className="text-red-600">{err}</p> : null}
      {!invoice && !loading ? (
        <p className="text-red-600">Invoice not found.</p>
      ) : null}
      {invoice ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Invoice">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">ID</dt>
                <dd className="font-mono text-xs">{invoice.id}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Student</dt>
                <dd>
                  <Link className="text-brand underline" href={`/bursar/students/${invoice.student_id}`}>
                    {invoice.student_id}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Total / Paid / Balance</dt>
                <dd>
                  {invoice.total_amount} / {invoice.amount_paid} / {invoice.balance}
                </dd>
              </div>
            </dl>
          </Card>
          <Card title="Record payment">
            <PaymentForm studentId={invoice.student_id} />
          </Card>
        </div>
      ) : null}
    </PageWrapper>
  );
}
