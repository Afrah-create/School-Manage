"use client";

import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useNavigationLoading } from "@/components/navigation/NavigationProvider";
import { resolveUploadUrl } from "@/lib/media";
import { BrandMark } from "@/components/brand/BrandMark";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useNotificationUnreadCount } from "@/hooks/useNotifications";
import { useAuthStore } from "@/store/authStore";
import { resolveActiveNavItem } from "./navActive";
import { ShellSearchDialog } from "./ShellSearchDialog";
import type { RoleShellConfig } from "./types";

type Props = {
  config: RoleShellConfig;
  onToggleMobileNav?: () => void;
};

function HeaderIconButton({
  children,
  label,
  onClick,
  badge,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: boolean | number;
  className?: string;
}) {
  const showDot = badge === true;
  const count = typeof badge === "number" ? badge : 0;
  const showCount = count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-ui hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {children}
      {showCount ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-card">
          {count > 9 ? "9+" : count}
        </span>
      ) : showDot ? (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-card" />
      ) : null}
    </button>
  );
}

export function ShellHeader({ config, onToggleMobileNav }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutRemote = useAuthStore((s) => s.logoutRemote);
  const { startNavigation } = useNavigationLoading();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const unreadCountQ = useNotificationUnreadCount();
  const unreadCount = unreadCountQ.data ?? 0;

  const pageTitle = useMemo(() => {
    const current = resolveActiveNavItem(config.items, pathname);
    return current?.label ?? "Dashboard";
  }, [config.items, pathname]);

  const onDashboardHome = /\/dashboard\/?$/.test(pathname);

  const initials = useMemo(() => {
    const fullName = user?.fullName?.trim() ?? "";
    if (!fullName) return "SM";
    return fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.fullName]);

  const avatarUrl = useMemo(() => resolveUploadUrl(user?.photoUrl), [user?.photoUrl]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (notificationsOpen) setMenuOpen(false);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    function onClickOutside(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const signOut = () => {
    void logoutRemote().then(() => router.push("/login"));
  };

  const openSearch = () => setSearchOpen(true);

  return (
    <>
      <header className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-3 px-4 sm:gap-4 sm:px-6">
          {/* Left: menu + context */}
          <div className="flex min-w-0 items-center gap-2 sm:min-w-[10rem] sm:max-w-[14rem] lg:max-w-xs">
            <button
              type="button"
              onClick={onToggleMobileNav}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-ui hover:bg-accent/50 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5 stroke-[1.5]" />
            </button>
            <div className="hidden min-w-0 sm:block">
              <BrandMark
                size="compact"
                subtitle={onDashboardHome ? config.roleLabel : pageTitle}
              />
            </div>
          </div>

          {/* Center: search */}
          <div className="flex min-w-0 flex-1 justify-center px-1">
            <button
              type="button"
              onClick={openSearch}
              className="hidden h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground transition-ui hover:border-border hover:bg-accent/40 md:flex lg:max-w-lg"
            >
              <Search className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.75} />
              <span className="flex-1 truncate text-left">Search pages and students…</span>
              <kbd className="hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: tools */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <HeaderIconButton label="Search" onClick={openSearch} className="md:hidden">
              <Search className="h-4 w-4" strokeWidth={1.75} />
            </HeaderIconButton>
            <div className="relative" ref={notificationsRef}>
              <HeaderIconButton
                label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
                badge={unreadCount > 0 ? unreadCount : undefined}
                onClick={() => {
                  setNotificationsOpen((v) => !v);
                  setMenuOpen(false);
                }}
              >
                <Bell className="h-4 w-4" strokeWidth={1.75} />
              </HeaderIconButton>
              <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
            </div>
            <ThemeToggle />
            <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-9 max-w-[12rem] items-center gap-2 rounded-lg border border-border bg-card py-0.5 pl-0.5 pr-2 transition-ui hover:bg-accent/50"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-xs font-medium text-foreground">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" fill className="object-cover" sizes="32px" unoptimized />
                  ) : (
                    initials
                  )}
                </span>
                <span className="hidden min-w-0 truncate text-left text-sm font-medium text-foreground lg:block">
                  {user?.fullName?.split(/\s+/)[0] ?? "Account"}
                </span>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[11rem] rounded-lg border border-border bg-card p-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-ui hover:bg-accent/50"
                onClick={() => {
                  setMenuOpen(false);
                  startNavigation();
                  router.push("/profile");
                }}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-ui hover:bg-accent/50"
                    onClick={() => {
                      setMenuOpen(false);
                      startNavigation();
                      router.push("/profile/notifications");
                    }}
                  >
                    Notifications
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-ui hover:bg-accent/50"
                    onClick={() => {
                      setMenuOpen(false);
                      startNavigation();
                      router.push("/profile/notifications/settings");
                    }}
                  >
                    Notification settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-ui hover:bg-accent/50"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <ShellSearchDialog open={searchOpen} onOpenChange={setSearchOpen} config={config} />
    </>
  );
}
