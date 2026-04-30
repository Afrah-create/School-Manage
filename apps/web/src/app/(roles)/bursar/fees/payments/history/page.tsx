"use client";

import { useEffect, useState } from "react";
import { ReceiptView, type PaymentReceipt } from "@/components/fees/ReceiptView";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";

export default function BursarPaymentHistoryPage() {
  const [studentId, setStudentId] = useState("");
  const [rows, setRows] = useState<PaymentReceipt[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const url = studentId
          ? `/fees/payments?studentId=${encodeURIComponent(studentId)}`
          : `/fees/payments`;
        const data = await apiGet<PaymentReceipt[]>(url);
        setRows(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  return (
    <PageWrapper title="Payment history" description="Recorded fee payments">
      <div className="mb-4 max-w-md">
        <Input
          label="Filter by student ID (optional)"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      </div>
      {err ? <p className="text-red-600">{err}</p> : null}
      {loading ? <p className="text-slate-600">Loading…</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.slice(0, 20).map((p, i) => (
          <ReceiptView
            key={i}
            payment={{
              receipt_number: String(p.receipt_number ?? p["receipt_number"] ?? ""),
              amount: (p.amount ?? p["amount"]) as string | number,
              method: String(p.method ?? p["method"] ?? ""),
              transaction_ref: (p.transaction_ref ?? p["transaction_ref"]) as string | null,
              paid_at: String(p.paid_at ?? p["paid_at"] ?? ""),
              student_id: String(p.student_id ?? p["student_id"] ?? ""),
            }}
          />
        ))}
      </div>
      {rows.length > 20 ? (
        <Card title="Full dump">
          <pre className="max-h-96 overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
        </Card>
      ) : null}
    </PageWrapper>
  );
}
