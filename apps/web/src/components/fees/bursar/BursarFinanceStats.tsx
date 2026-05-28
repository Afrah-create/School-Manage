"use client";

import type { InvoiceFinanceStats } from "@/lib/feeFinanceStats";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { Card } from "@/components/ui/Card";

export function BursarFinanceStats({
  stats,
  variant = "full",
}: {
  stats: InvoiceFinanceStats;
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Outstanding">
          <MoneyAmount amount={stats.outstandingUgx} compact size="lg" tone="warning" />
        </Card>
        <Card title="Active bills">
          <p className="text-xl font-semibold tabular-nums">{stats.active}</p>
          <p className="mt-1 text-xs text-muted-foreground">Unpaid invoices</p>
        </Card>
        <Card title="Collected">
          <MoneyAmount amount={stats.collectedOnInvoicesUgx} compact size="lg" tone="positive" />
        </Card>
        <Card title="Arrears flagged">
          <p className="text-xl font-semibold tabular-nums text-amber-800 dark:text-amber-300">
            {stats.arrears}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card title="Outstanding">
        <MoneyAmount amount={stats.outstandingUgx} compact size="lg" tone="warning" />
        <p className="mt-1 text-xs text-muted-foreground">Still to collect</p>
      </Card>
      <Card title="Active bills">
        <p className="text-2xl font-semibold tabular-nums">{stats.active}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {stats.partial > 0 ? `${stats.partial} partially paid` : "Awaiting payment"}
        </p>
      </Card>
      <Card title="Collected">
        <MoneyAmount amount={stats.collectedOnInvoicesUgx} compact size="lg" tone="positive" />
        <p className="mt-1 text-xs text-muted-foreground">Recorded on invoices</p>
      </Card>
      <Card title="Paid in full">
        <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
          {stats.paid}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Settled invoices</p>
      </Card>
      <Card title="Arrears">
        <p className="text-2xl font-semibold tabular-nums">{stats.arrears}</p>
        <p className="mt-1 text-xs text-muted-foreground">Above school threshold</p>
      </Card>
    </div>
  );
}
