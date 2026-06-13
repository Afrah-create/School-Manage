"use client";

import type { TenantBillingStatus } from "@uganda-cbc-sms/shared";
import { CreditCard, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SubscriptionBlockedScreen({
  billing,
  title = "School access paused",
}: {
  billing?: Pick<TenantBillingStatus, "message"> | null;
  title?: string;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-4 font-heading text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {billing?.message ??
            "Your school's termly subscription is unpaid. Contact your school administrator to restore access."}
        </p>
      </div>
    </div>
  );
}

export function SchoolBillingPage({
  billing,
  onPay,
  onMockComplete,
  paying,
  history,
}: {
  billing: TenantBillingStatus;
  onPay: () => void;
  onMockComplete?: () => void;
  paying: boolean;
  history: Array<{
    id: string;
    amountUgx: number;
    status: string;
    periodLabel: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}) {
  const period = billing.currentPeriod;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">School subscription</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pay your termly SchoolManage subscription to restore full access for your school.
        </p>
      </div>

      {!billing.canUseApp ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {billing.message ?? "Payment is required to continue using SchoolManage."}
          </p>
        </div>
      ) : billing.accessStatus === "grace" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-muted-foreground">
          {billing.message}
        </div>
      ) : null}

      {period ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current term</p>
              <p className="font-heading text-lg font-semibold">{period.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Due {new Date(period.dueAt).toLocaleDateString()} · Grace {billing.graceDays} day
                {billing.graceDays === 1 ? "" : "s"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-heading text-2xl font-semibold">
                {period.currency} {period.amountUgx.toLocaleString()}
              </p>
            </div>
          </div>
          {billing.canPay ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={onPay} loading={paying} disabled={paying}>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay now
              </Button>
              {onMockComplete ? (
                <Button variant="secondary" onClick={onMockComplete} disabled={paying}>
                  Complete test payment (dev)
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No outstanding subscription invoice. Your school is up to date.
        </div>
      )}

      {history.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold">Payment history</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {history.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                <span>
                  {p.periodLabel} · {p.status}
                </span>
                <span className="font-medium">UGX {p.amountUgx.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
