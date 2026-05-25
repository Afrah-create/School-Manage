"use client";

import type { ReactNode } from "react";

export function ChartPanel({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {empty ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No data for the selected filters</p>
      ) : (
        <div className="h-[280px] w-full">{children}</div>
      )}
    </div>
  );
}
