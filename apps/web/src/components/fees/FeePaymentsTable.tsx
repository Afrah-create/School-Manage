"use client";

import Link from "next/link";
import type { FeePayment } from "@uganda-cbc-sms/shared";
import { Table, type Column } from "@/components/ui/Table";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { paymentMethodLabel } from "@/lib/formatMoney";

export function FeePaymentsTable({
  rows,
  studentBasePath = "/bursar/students",
  emptyMessage = "No payments recorded yet.",
}: {
  rows: FeePayment[];
  studentBasePath?: string;
  emptyMessage?: string;
}) {
  const columns: Column<FeePayment>[] = [
    {
      key: "receipt",
      header: "Receipt",
      render: (r) => <span className="font-mono text-xs">{r.receiptNumber}</span>,
    },
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <Link className="text-brand hover:underline" href={`${studentBasePath}/${r.studentId}`}>
          {r.studentName ?? r.studentId.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "amount",
      header: "Amount (UGX)",
      render: (r) => <MoneyAmount amount={r.amount} size="sm" tone="positive" />,
    },
    {
      key: "method",
      header: "Method",
      render: (r) => paymentMethodLabel(r.method),
    },
    {
      key: "date",
      header: "Date",
      render: (r) =>
        r.paidAt ? new Date(r.paidAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—",
    },
  ];

  return (
    <Table
      columns={columns as unknown as Column<Record<string, unknown>>[]}
      rows={rows as unknown as Record<string, unknown>[]}
      emptyState={<p className="text-sm text-muted-foreground">{emptyMessage}</p>}
    />
  );
}
