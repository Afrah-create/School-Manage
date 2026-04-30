"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; activePrefix?: string; exactMatch?: boolean }[] = [
  { href: "/bursar/dashboard", label: "Dashboard" },
  { href: "/bursar/fees", label: "Fee Overview", exactMatch: true },
  {
    href: "/bursar/fees/invoices",
    label: "Invoices",
    activePrefix: "/bursar/fees/invoices",
  },
  {
    href: "/bursar/fees/payments",
    label: "Record Payment",
    activePrefix: "/bursar/fees/payments",
  },
  {
    href: "/bursar/fees/reports",
    label: "Financial Reports",
    activePrefix: "/bursar/fees/reports",
  },
];

function linkClass(active: boolean): string {
  return `block rounded-md px-3 py-2 text-sm font-medium ${
    active ? "bg-brand text-white" : "text-slate-700 hover:bg-brand-light"
  }`;
}

function isActive(pathname: string, item: (typeof ITEMS)[0]): boolean {
  if (item.href.endsWith("/dashboard")) return pathname === item.href;
  if (item.exactMatch) return pathname === item.href;
  const p = item.activePrefix ?? item.href;
  return pathname === p || pathname.startsWith(`${p}/`);
}

export function BursarSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="text-lg font-bold text-brand">Bursar</div>
        <p className="text-xs text-slate-500">Uganda CBC SMS</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(isActive(pathname, item))}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
