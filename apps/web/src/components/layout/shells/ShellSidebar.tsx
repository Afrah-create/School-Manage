"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICON_MAP } from "./navIconMap";
import type { RoleShellConfig } from "./types";

function isActive(pathname: string, href: string, activePrefix?: string, exactMatch?: boolean): boolean {
  if (href.endsWith("/dashboard")) return pathname === href;
  if (exactMatch) return pathname === href;
  const p = activePrefix ?? href;
  return pathname === p || pathname.startsWith(`${p}/`);
}

export function ShellSidebar({ config, mobile = false }: { config: RoleShellConfig; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <aside
      className={`${mobile ? "flex" : "hidden lg:flex"} h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white`}
    >
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="text-lg font-semibold text-slate-900">{config.roleLabel}</div>
        <p className="text-xs text-slate-500">{config.productLabel}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {config.items.map((item) => {
          const active = isActive(pathname, item.href, item.activePrefix, item.exactMatch);
          const Icon = NAV_ICON_MAP[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
