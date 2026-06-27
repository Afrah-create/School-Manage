"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type MouseEvent } from "react";
import { NAV_ICON_MAP } from "./navIconMap";
import { isNavItemActive } from "./navActive";
import { isNavGroupActive } from "./navFlatten";
import type { NavItem } from "./types";

type NavLinkProps = {
  item: NavItem;
  active: boolean;
  pending?: boolean;
  nested?: boolean;
  onNavClick: (href: string) => void;
};

export function ShellNavLink({ item, active, pending, nested = false, onNavClick }: NavLinkProps) {
  const Icon = NAV_ICON_MAP[item.icon];

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavClick(item.href);
  };

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      aria-current={active ? "page" : undefined}
      aria-busy={pending}
      className={`group relative flex items-center gap-3 rounded-lg text-sm transition-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar ${
        nested ? "px-2 py-1.5 pl-9" : "px-2.5 py-2"
      } ${pending ? "opacity-70" : ""} ${
        active
          ? "bg-nav-active font-medium text-nav-active-foreground shadow-sm"
          : "font-normal text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
    >
      {active && !nested ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand"
          aria-hidden
        />
      ) : null}
      <span
        className={`flex shrink-0 items-center justify-center rounded-md transition-ui ${
          nested ? "h-6 w-6" : "h-8 w-8"
        } ${
          active
            ? "bg-brand/15 text-brand dark:bg-brand/25 dark:text-emerald-300"
            : "bg-sidebar-accent/80 text-sidebar-muted group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
        }`}
      >
        <Icon className={nested ? "h-4 w-4 stroke-[1.75]" : "h-[1.125rem] w-[1.125rem] stroke-[1.75]"} />
      </span>
      <span className="min-w-0 flex-1 truncate leading-snug">{item.label}</span>
      {pending ? (
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand" aria-hidden />
      ) : null}
    </Link>
  );
}

type NavGroupProps = {
  item: NavItem;
  pathname: string;
  allItems: NavItem[];
  pendingHref: string | null;
  onNavClick: (href: string) => void;
};

function ShellNavSectionLabel({ label }: { label: string }) {
  return (
    <p
      className="mb-1 mt-2.5 pl-9 pr-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted first:mt-1"
      role="presentation"
    >
      {label}
    </p>
  );
}

export function ShellNavGroup({ item, pathname, allItems, pendingHref, onNavClick }: NavGroupProps) {
  const children = item.children ?? [];
  const groupActive = isNavGroupActive(item, pathname);
  const [open, setOpen] = useState(groupActive);
  const prevGroupActive = useRef(groupActive);
  const Icon = NAV_ICON_MAP[item.icon];

  // Open when entering this section; close when leaving. Do not re-open on in-section navigation
  // so users can manually collapse the menu while staying on a child page.
  useEffect(() => {
    if (groupActive && !prevGroupActive.current) {
      setOpen(true);
    }
    if (!groupActive) {
      setOpen(false);
    }
    prevGroupActive.current = groupActive;
  }, [groupActive]);

  const handleParentClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavClick(item.href);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div
        className={`group relative flex items-center gap-1 rounded-lg pr-1 transition-ui ${
          groupActive ? "bg-sidebar-accent/60" : "hover:bg-sidebar-accent/40"
        }`}
      >
        {groupActive ? (
          <span
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand"
            aria-hidden
          />
        ) : null}
        <Link
          href={item.href}
          onClick={handleParentClick}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar ${
            groupActive
              ? "font-medium text-sidebar-foreground"
              : "font-normal text-sidebar-muted group-hover:text-sidebar-foreground"
          }`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-ui ${
              groupActive
                ? "bg-brand/15 text-brand dark:bg-brand/25 dark:text-emerald-300"
                : "bg-sidebar-accent/80 text-sidebar-muted group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
            }`}
          >
            <Icon className="h-[1.125rem] w-[1.125rem] stroke-[1.75]" />
          </span>
          <span className="min-w-0 flex-1 truncate leading-snug">{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${item.label} menu`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-ui hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={`h-4 w-4 stroke-[1.75] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div className="flex flex-col gap-0.5 pb-0.5">
          {children.map((child, index) => {
            const prevSection = index > 0 ? children[index - 1]?.sectionLabel : undefined;
            const showSection = Boolean(child.sectionLabel && child.sectionLabel !== prevSection);

            return (
              <Fragment key={child.href}>
                {showSection && child.sectionLabel ? (
                  <ShellNavSectionLabel label={child.sectionLabel} />
                ) : null}
                <ShellNavLink
                  item={child}
                  nested
                  active={isNavItemActive(child, pathname, allItems)}
                  pending={pendingHref === child.href}
                  onNavClick={onNavClick}
                />
              </Fragment>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
