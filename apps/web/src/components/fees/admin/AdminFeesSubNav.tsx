"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/fees/structure", label: "Fee structure" },
  { href: "/admin/fees/overview", label: "Billing overview" },
  { href: "/admin/fees/reports", label: "Financial reports" },
] as const;

export function AdminFeesSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/admin/fees/structure" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-ui ${
              active
                ? "bg-brand text-white"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
