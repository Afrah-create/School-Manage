"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { NAV_ICON_MAP } from "./navIconMap";
import { useAuthStore } from "@/store/authStore";
import type { RoleShellConfig } from "./types";

function isActive(pathname: string, href: string, activePrefix?: string, exactMatch?: boolean): boolean {
  if (href.endsWith("/dashboard")) return pathname === href;
  if (exactMatch) return pathname === href;
  const p = activePrefix ?? href;
  return pathname === p || pathname.startsWith(`${p}/`);
}

export function ShellSidebar({ config, mobile = false }: { config: RoleShellConfig; mobile?: boolean }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const initials = useMemo(() => {
    const fullName = user?.fullName?.trim() ?? "";
    if (!fullName) return "UC";
    const parts = fullName.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "UC";
  }, [user?.fullName]);

  return (
    <aside
      className={`${mobile ? "flex" : "hidden lg:flex"} h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-ui`}
    >
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
          U
        </div>
        <p className="text-sm font-medium text-foreground">Uganda CBC SMS</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <p className="px-4 pb-1 pt-4 text-[10px] uppercase tracking-widest text-muted-foreground/60">Navigation</p>
        <nav className="flex flex-col gap-1 pb-3">
          {config.items.map((item) => {
            const active = isActive(pathname, item.href, item.activePrefix, item.exactMatch);
            const Icon = NAV_ICON_MAP[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`transition-ui mx-2 flex items-center gap-3 rounded-lg px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar ${
                  active
                    ? "bg-nav-active font-medium text-foreground"
                    : "font-normal text-muted-foreground hover:bg-accent/50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 stroke-[1.5]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="transition-ui flex items-center gap-3 border-t border-sidebar-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{user?.fullName ?? "Signed in user"}</p>
          <p className="truncate text-xs text-muted-foreground">{config.roleLabel}</p>
        </div>
      </div>
    </aside>
  );
}
