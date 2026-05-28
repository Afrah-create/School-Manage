"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { FeeInvoice, FeePayment } from "@uganda-cbc-sms/shared";
import { FeeCollectionCharts } from "@/components/fees/charts/FeeCollectionCharts";
import { BursarRecentPayments } from "@/components/fees/bursar/BursarRecentPayments";
import { FeeInvoicesTable } from "@/components/fees/FeeInvoicesTable";
import { Alert } from "@/components/ui/Alert";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import type { InvoiceFinanceStats } from "@/lib/feeFinanceStats";
import { filterInvoices } from "@/lib/feeFinanceStats";

const HT_STUDENT = "/headteacher/students";
const HT_INVOICE = "/headteacher/fees/invoices";

export function HeadteacherFinanceOverview({
  stats,
  rows,
  payments,
}: {
  stats: InvoiceFinanceStats;
  rows: FeeInvoice[];
  payments: FeePayment[];
}) {
  const activeBills = useMemo(() => filterInvoices(rows, { bucket: "active" }).slice(0, 10), [rows]);
  const arrears = useMemo(() => filterInvoices(rows, { bucket: "arrears" }).slice(0, 6), [rows]);
  const collectionPct =
    stats.billedUgx > 0 ? Math.min(100, Math.round((stats.collectedOnInvoicesUgx / stats.billedUgx) * 100)) : 0;

  return (
    <div className="space-y-8">
      <Alert tone="info">
        View-only finance overview. The bursar records payments; you can monitor collections and follow up on
        arrears with families.
      </Alert>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid lg:grid-cols-[1.4fr_1fr]">
          <div className="border-b border-border bg-gradient-to-br from-emerald-500/10 to-transparent p-6 lg:border-b-0 lg:border-r">
            <p className="text-sm font-medium text-muted-foreground">School-wide outstanding</p>
            <div className="mt-2">
              <MoneyAmount amount={stats.outstandingUgx} compact size="hero" tone="warning" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {collectionPct}% collected across all terms · {stats.active} open bill
              {stats.active === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border">
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Collected</p>
              <div className="mt-1">
                <MoneyAmount amount={stats.collectedOnInvoicesUgx} compact size="lg" tone="positive" />
              </div>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Total billed</p>
              <div className="mt-1">
                <MoneyAmount amount={stats.billedUgx} compact size="lg" />
              </div>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Paid in full</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {stats.paid}
              </p>
            </div>
            <div className="bg-card p-4">
              <p className="text-xs text-muted-foreground">Arrears</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-800 dark:text-amber-300">
                {stats.arrears}
              </p>
            </div>
          </div>
        </div>
      </section>

      <FeeCollectionCharts stats={stats} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Active bills</h2>
              <p className="text-sm text-muted-foreground">Students with an outstanding balance</p>
            </div>
            <Link className="text-sm font-medium text-brand hover:underline" href="/headteacher/fees/invoices?tab=active">
              View all ({stats.active})
            </Link>
          </div>
          <div className="overflow-x-auto p-4">
            {activeBills.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No unpaid invoices on record.</p>
            ) : (
              <FeeInvoicesTable
                rows={activeBills}
                studentBasePath={HT_STUDENT}
                invoiceBasePath={HT_INVOICE}
                showCollectAction={false}
              />
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Recent payments</h2>
          <p className="mb-4 text-sm text-muted-foreground">Latest collections by the bursar.</p>
          <BursarRecentPayments
            rows={payments}
            limit={8}
            viewAllHref="/headteacher/fees/payments"
          />
        </aside>
      </section>

      {arrears.length > 0 ? (
        <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Arrears follow-up</h2>
            <Link href="/headteacher/fees/invoices?tab=arrears" className="text-sm font-medium text-brand hover:underline">
              View all arrears
            </Link>
          </div>
          <FeeInvoicesTable
            rows={arrears}
            studentBasePath={HT_STUDENT}
            invoiceBasePath={HT_INVOICE}
            showCollectAction={false}
          />
        </section>
      ) : null}
    </div>
  );
}
