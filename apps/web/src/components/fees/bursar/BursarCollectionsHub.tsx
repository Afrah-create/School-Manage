"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { AlertTriangle, CreditCard, FileText, Receipt, Users } from "lucide-react";
import type { FeeInvoice, FeePayment } from "@uganda-cbc-sms/shared";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { BursarRecentPayments } from "@/components/fees/bursar/BursarRecentPayments";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import type { InvoiceFinanceStats } from "@/lib/feeFinanceStats";
import { filterInvoices } from "@/lib/feeFinanceStats";

const ACTIONS: {
  href: string;
  label: string;
  icon: typeof CreditCard;
  emphasis?: boolean;
}[] = [
  { href: "/bursar/fees/payments", label: "Record payment", icon: CreditCard, emphasis: true },
  { href: "/bursar/fees/invoices?tab=active", label: "Active bills", icon: Receipt },
  { href: "/bursar/fees/invoices?tab=bulk", label: "Bill class", icon: FileText },
  { href: "/bursar/students", label: "Find student", icon: Users },
];

function StatChip({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "default" | "warning" | "positive";
}) {
  const border =
    tone === "warning"
      ? "border-amber-200/80 dark:border-amber-900/50"
      : tone === "positive"
        ? "border-emerald-200/80 dark:border-emerald-900/50"
        : "border-border";
  return (
    <div className={`rounded-lg border bg-card px-4 py-3 ${border}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1">{value}</div>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function BursarCollectionsHub({
  stats,
  rows,
  payments,
}: {
  stats: InvoiceFinanceStats;
  rows: FeeInvoice[];
  payments: FeePayment[];
}) {
  const activeBills = useMemo(() => filterInvoices(rows, { bucket: "active" }).slice(0, 10), [rows]);
  const arrears = useMemo(() => filterInvoices(rows, { bucket: "arrears" }), [rows]);

  return (
    <div className="space-y-8">
      {/* Summary strip */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid lg:grid-cols-[1.4fr_1fr]">
          <div className="border-b border-border bg-gradient-to-br from-brand/8 to-transparent p-6 lg:border-b-0 lg:border-r">
            <p className="text-sm font-medium text-muted-foreground">Total outstanding</p>
            <div className="mt-2">
              <MoneyAmount amount={stats.outstandingUgx} compact size="hero" tone="warning" />
            </div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Amount still to collect across all unpaid invoices. Figures update when you record payments.
            </p>
            <div className="mt-4">
              <Link href="/bursar/fees/payments">
                <Button>Record payment</Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border p-px sm:grid-cols-2">
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Active bills</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.active}</p>
              <p className="text-xs text-muted-foreground">
                {stats.partial > 0 ? `${stats.partial} partial` : "Unpaid"}
              </p>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Collected</p>
              <div className="mt-1">
                <MoneyAmount amount={stats.collectedOnInvoicesUgx} compact size="lg" tone="positive" />
              </div>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Paid in full</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {stats.paid}
              </p>
              <p className="text-xs text-muted-foreground">Invoices settled</p>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Arrears flagged</p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums ${
                  stats.arrears > 0 ? "text-amber-800 dark:text-amber-300" : ""
                }`}
              >
                {stats.arrears}
              </p>
              <p className="text-xs text-muted-foreground">Need follow-up</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Quick actions</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map(({ href, label, icon: Icon, emphasis }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-ui hover:border-brand/50 hover:bg-accent/40 ${
                emphasis ? "border-brand/40 bg-brand/5" : "border-border bg-card"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                  emphasis ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {stats.arrears > 0 ? (
        <Alert tone="info">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{stats.arrears}</strong> invoice{stats.arrears === 1 ? "" : "s"} exceed the arrears
              threshold.{" "}
              <Link className="font-medium text-brand underline" href="/bursar/fees/invoices?tab=arrears">
                Review arrears
              </Link>
            </span>
          </span>
        </Alert>
      ) : null}

      {/* Main workspace */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Active bills</h2>
              <p className="text-sm text-muted-foreground">
                {stats.active} unpaid · use <strong className="font-medium text-foreground">Collect</strong> to
                record payment
              </p>
            </div>
            {stats.active > activeBills.length ? (
              <Link
                className="text-sm font-medium text-brand hover:underline"
                href="/bursar/fees/invoices?tab=active"
              >
                View all ({stats.active})
              </Link>
            ) : null}
          </div>
          <div className="overflow-x-auto p-2 sm:p-4">
            {activeBills.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No unpaid invoices — all caught up.
              </p>
            ) : (
              <FeeInvoicesTable rows={activeBills} emptyMessage="No active bills." />
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Recent payments</h2>
          <p className="mb-4 text-sm text-muted-foreground">Latest collections recorded in the system.</p>
          <BursarRecentPayments rows={payments} limit={8} />
        </aside>
      </section>

      {arrears.length > 0 ? (
        <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">Arrears follow-up</h2>
              <p className="text-sm text-muted-foreground">Highest-priority outstanding balances.</p>
            </div>
            {arrears.length > 6 ? (
              <Link href="/bursar/fees/invoices?tab=arrears">
                <Button variant="secondary" className="text-sm">
                  All {arrears.length} arrears
                </Button>
              </Link>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-200/60 bg-card dark:border-amber-900/40">
            <FeeInvoicesTable rows={arrears.slice(0, 6)} emptyMessage="No arrears." />
          </div>
        </section>
      ) : null}

      {/* Secondary metrics row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatChip
          label="Total billed"
          value={<MoneyAmount amount={stats.billedUgx} compact size="lg" />}
          sub="On all invoices"
        />
        <StatChip
          label="Collection rate"
          value={
            stats.billedUgx > 0 ? (
              <span className="text-xl font-semibold tabular-nums">
                {Math.min(100, Math.round((stats.collectedOnInvoicesUgx / stats.billedUgx) * 100))}%
              </span>
            ) : (
              "—"
            )
          }
          sub="Collected vs billed"
          tone="positive"
        />
        <StatChip
          label="Invoices on file"
          value={<span className="text-xl font-semibold tabular-nums">{stats.total}</span>}
          sub={`${stats.paid} paid · ${stats.active} open`}
        />
      </section>
    </div>
  );
}
