"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type DashboardQuickLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function DashboardQuickAccess({ groups }: { groups: { title: string; links: DashboardQuickLink[] }[] }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Quick access</h2>
        <p className="text-sm text-muted-foreground">Shortcuts to your most-used areas.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.title} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.links.map(({ href, label, description, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-ui hover:bg-accent/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="block text-sm font-medium text-foreground">{label}</span>
                      <span className="block text-xs text-muted-foreground">{description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
