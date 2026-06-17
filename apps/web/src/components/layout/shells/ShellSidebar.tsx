"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useNavigationLoading } from "@/components/navigation/NavigationProvider";
import { BrandGradientStrip } from "@/components/brand/BrandGradientStrip";
import { BrandMark } from "@/components/brand/BrandMark";
import { resolveUploadUrl } from "@/lib/media";
import { useAuthStore } from "@/store/authStore";
import { isNavItemActive } from "./navActive";
import { ShellNavGroup } from "./ShellNavGroup";
import { ShellNavLink } from "./ShellNavGroup";
import type { NavItem, RoleShellConfig } from "./types";

type ShellSidebarProps = {
  config: RoleShellConfig;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function ShellSidebar({ config, mobile = false, onNavigate }: ShellSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { startNavigation } = useNavigationLoading();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleNavClick = (href: string) => {
    startNavigation();
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
      onNavigate?.();
    });
  };

  const initials = useMemo(() => {
    const fullName = user?.fullName?.trim() ?? "";
    if (!fullName) return "SM";
    const parts = fullName.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "SM";
  }, [user?.fullName]);

  const avatarUrl = useMemo(() => resolveUploadUrl(user?.photoUrl), [user?.photoUrl]);

  const { mainItem, menuItems } = useMemo(() => {
    const dashboard = config.items.find((i) => i.href.endsWith("/dashboard"));
    const rest = config.items.filter((i) => !i.href.endsWith("/dashboard"));
    return { mainItem: dashboard, menuItems: rest };
  }, [config.items]);

  const renderMenuItem = (item: NavItem) => {
    if (item.children?.length) {
      return (
        <ShellNavGroup
          key={item.href}
          item={item}
          pathname={pathname}
          allItems={config.items}
          pendingHref={pendingHref}
          onNavClick={handleNavClick}
        />
      );
    }

    return (
      <ShellNavLink
        key={item.href}
        item={item}
        active={isNavItemActive(item, pathname, config.items)}
        pending={pendingHref === item.href}
        onNavClick={handleNavClick}
      />
    );
  };

  return (
    <aside
      className={`${mobile ? "flex" : "hidden lg:flex"} h-full w-[var(--sidebar-width)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-ui`}
    >
      <BrandGradientStrip className="shrink-0 border-b border-sidebar-border">
        <div className="px-4 py-4">
          <BrandMark tone="gradient" size="compact" subtitle={config.roleLabel} />
        </div>
      </BrandGradientStrip>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin]">
        {mainItem ? (
          <div className="mb-5">
            <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
              Overview
            </p>
            <ShellNavLink
              item={mainItem}
              active={isNavItemActive(mainItem, pathname, config.items)}
              pending={pendingHref === mainItem.href}
              onNavClick={handleNavClick}
            />
          </div>
        ) : null}

        {menuItems.length > 0 ? (
          <div>
            <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
              Menu
            </p>
            <nav className="flex flex-col gap-0.5">{menuItems.map(renderMenuItem)}</nav>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => {
            startNavigation();
            startTransition(() => {
              onNavigate?.();
              router.push("/profile");
            });
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2.5 text-left transition-ui hover:border-brand/30 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs font-semibold text-foreground">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" sizes="36px" unoptimized />
            ) : (
              initials
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-sidebar-foreground">
              {user?.fullName ?? "Signed in"}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-sidebar-muted">
              {user?.email ?? config.roleLabel}
            </span>
          </span>
        </button>
      </div>
    </aside>
  );
}
