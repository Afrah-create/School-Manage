"use client";

import Link from "next/link";
import type { FeeInvoice } from "@uganda-cbc-sms/shared";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { MoneyAmount } from "@/components/ui/MoneyAmount";

export function FeeInvoicesTable({
  rows,
  invoiceBasePath = "/bursar/fees/invoices",
  studentBasePath = "/bursar/students",
  paymentsBasePath = "/bursar/fees/payments",
  showCollectAction = true,
  emptyMessage = "No invoices found.",
}: {
  rows: FeeInvoice[];
  invoiceBasePath?: string;
  studentBasePath?: string;
  paymentsBasePath?: string;
  /** Show quick link to record payment when balance > 0 */
  showCollectAction?: boolean;
  emptyMessage?: string;
}) {
  const columns: Column<FeeInvoice>[] = [
    {
      key: "student",
      header: "Student",
      render: (r) => (
        <div>
          <Link className="font-medium text-brand hover:underline" href={`${studentBasePath}/${r.studentId}`}>
            {r.studentName ?? "Student"}
          </Link>
          {r.studentNumber ? (
            <p className="text-xs text-muted-foreground">#{r.studentNumber}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "term",
      header: "Term",
      render: (r) => (
        <span className="text-sm">
          {r.termLabel ?? "—"}
          {r.yearName ? <span className="text-muted-foreground"> · {r.yearName}</span> : null}
        </span>
      ),
    },
    {
      key: "billed",
      header: "Billed",
      render: (r) => <MoneyAmount amount={r.totalAmount} size="sm" />,
    },
    {
      key: "paid",
      header: "Paid",
      render: (r) => <MoneyAmount amount={r.amountPaid} size="sm" tone="positive" />,
    },
    {
      key: "balance",
      header: "Balance",
      render: (r) => (
        <MoneyAmount
          amount={r.balance}
          size="sm"
          tone={Number(r.balance) > 0 ? "warning" : "positive"}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const bal = Number(r.balance);
        if (bal <= 0) return <Badge tone="success">Paid</Badge>;
        if (r.isFlagged) return <Badge tone="warning">Arrears</Badge>;
        return <Badge tone="neutral">Outstanding</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (r) => {
        const hasBalance = Number(r.balance) > 0;
        return (
          <div className="flex flex-wrap justify-end gap-2">
            {showCollectAction && hasBalance ? (
              <Link
                className="text-xs font-semibold text-brand hover:underline"
                href={`${paymentsBasePath}?studentId=${encodeURIComponent(r.studentId)}&invoiceId=${encodeURIComponent(r.id)}`}
              >
                Collect
              </Link>
            ) : null}
            <Link className="text-xs font-medium text-muted-foreground hover:text-brand hover:underline" href={`${invoiceBasePath}/${r.id}`}>
              Details
            </Link>
          </div>
        );
      },
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
