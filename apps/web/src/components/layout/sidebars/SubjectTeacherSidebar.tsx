"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; activePrefix?: string }[] = [
  { href: "/subject-teacher/dashboard", label: "Dashboard" },
  {
    href: "/subject-teacher/assessment/cbc",
    label: "CBC Assessment",
    activePrefix: "/subject-teacher/assessment/cbc",
  },
  {
    href: "/subject-teacher/assessment/alevel",
    label: "A-Level Assessment",
    activePrefix: "/subject-teacher/assessment/alevel",
  },
];

function linkClass(active: boolean): string {
  return `block rounded-md px-3 py-2 text-sm font-medium ${
    active ? "bg-brand text-white" : "text-slate-700 hover:bg-brand-light"
  }`;
}

function isActive(pathname: string, item: (typeof ITEMS)[0]): boolean {
  if (item.href.endsWith("/dashboard")) return pathname === item.href;
  const p = item.activePrefix ?? item.href;
  return pathname === p || pathname.startsWith(`${p}/`);
}

export function SubjectTeacherSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="text-lg font-bold text-brand">Subject teacher</div>
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
