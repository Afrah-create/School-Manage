import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DashboardMetric } from "./types";

export function DashboardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
        <p className="font-body mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}

export function KpiGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <article key={metric.label} className="rounded-xl border border-border bg-card p-4 transition-ui">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
          <p className="font-heading mt-2 text-2xl font-semibold text-card-foreground">{metric.value}</p>
          {metric.delta ? (
            <span
              className={`mt-2 inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${
                metric.deltaTone === "positive"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : metric.deltaTone === "negative"
                    ? "bg-red-500/10 text-red-700 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {metric.delta}
            </span>
          ) : null}
          {metric.helper ? (
            <p className="font-body mt-1 text-xs text-muted-foreground">{metric.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export function DashboardPanel({
  title,
  children,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card transition-ui">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-heading text-sm font-medium text-card-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function DashboardTwoColumn({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary: ReactNode;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">{primary}</div>
      <div>{secondary}</div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3 px-5 py-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card px-5 py-10 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-10 w-10 text-red-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">Something went wrong</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </section>
  );
}
