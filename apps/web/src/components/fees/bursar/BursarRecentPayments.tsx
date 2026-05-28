"use client";

import Link from "next/link";
import type { FeePayment } from "@uganda-cbc-sms/shared";
import { EmptyState } from "@/components/feedback/EmptyState";
import { CreditCard } from "lucide-react";
import { MoneyAmount } from "@/components/ui/MoneyAmount";

export function BursarRecentPayments({
  rows,
  limit = 6,
  viewAllHref = "/bursar/fees/payments/history",
}: {
  rows: FeePayment[];
  limit?: number;
  viewAllHref?: string;
}) {
  const recent = [...rows]
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, limit);

  if (recent.length === 0) {
    return (
      <EmptyState
        title="No payments yet"
        description="Payments you record will appear here."
        icon={CreditCard}
        action={{ label: "Record payment", href: "/bursar/fees/payments" }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Recent payments</p>
        <Link className="text-xs font-medium text-brand hover:underline" href={viewAllHref}>
          View all
        </Link>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {recent.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <div className="min-w-0">
              <Link className="font-medium text-brand hover:underline" href={`/bursar/students/${p.studentId}`}>
                {p.studentName ?? "Student"}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">{p.receiptNumber}</p>
            </div>
            <div className="text-right">
              <MoneyAmount amount={p.amount} size="sm" />
              <p className="text-xs text-muted-foreground">
                {p.paidAt
                  ? new Date(p.paidAt).toLocaleDateString(undefined, { dateStyle: "medium" })
                  : "—"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
