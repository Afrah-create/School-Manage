"use client";

import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { resolveUploadUrl } from "@/lib/media";
import { useAuthStore } from "@/store/authStore";
import type { RoleShellConfig } from "./types";

type Props = {
  config: RoleShellConfig;
  onToggleMobileNav?: () => void;
};

export function ShellHeader({ config, onToggleMobileNav }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasUnread = true;

  const pageTitle = useMemo(() => {
    const current = config.items.find((item) => {
      if (item.exactMatch) return pathname === item.href;
      const prefix = item.activePrefix ?? item.href;
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    });
    return current?.label ?? `${config.roleLabel} Dashboard`;
  }, [config.items, config.roleLabel, pathname]);

  const initials = useMemo(() => {
    const fullName = user?.fullName?.trim() ?? "";
    if (!fullName) return "UC";
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
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const signOut = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="transition-ui rounded-md p-2 text-muted-foreground hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5 stroke-[1.5]" />
        </button>
        <h1 className="hidden text-base font-medium text-foreground md:block">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="transition-ui hidden w-48 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 md:flex"
        >
          <Search className="h-4 w-4 stroke-[1.5]" />
          <span>Search…</span>
        </button>
        <button
          type="button"
          className="transition-ui relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 stroke-[1.5]" />
          {hasUnread ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" /> : null}
        </button>
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="transition-ui inline-flex items-center gap-1 rounded-md p-0.5 hover:bg-accent/50"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-foreground">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill className="object-cover" sizes="32px" unoptimized />
              ) : (
                initials
              )}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-10 z-50 min-w-[11rem] rounded-md border border-border bg-card p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="transition-ui w-full rounded-sm px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
              >
                Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="transition-ui w-full rounded-sm px-3 py-2 text-left text-sm text-foreground hover:bg-accent/50"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
    {searchOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
        onClick={() => setSearchOpen(false)}
      >
        {/* STYLE: lightweight cmdk-like modal shell keeps behavior stub-only while preserving layout contract. */}
        <div
          className="w-full max-w-xl rounded-lg border border-border bg-card shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4 stroke-[1.5]" />
              <span>Search commands (stub)</span>
            </div>
          </div>
          <div className="px-5 py-4 text-sm text-muted-foreground">
            Start typing to search pages, actions, and records.
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
