"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export function DashboardTableSection({
  title,
  subtitle,
  headerLink,
  headerLinkLabel,
  toolbar,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  headerLink?: string;
  headerLinkLabel?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {toolbar}
          {headerLink && headerLinkLabel ? (
            <Link href={headerLink} className="text-sm font-medium text-brand hover:underline">
              {headerLinkLabel}
            </Link>
          ) : null}
        </div>
      </header>
      <div className="overflow-x-auto p-2 sm:p-4">{children}</div>
      {footer ? <footer className="border-t border-border px-5 py-3">{footer}</footer> : null}
    </section>
  );
}
