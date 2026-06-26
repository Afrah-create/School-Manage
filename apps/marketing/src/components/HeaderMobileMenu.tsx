"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BRAND } from "@uganda-cbc-sms/brand";
import { homeSectionLinks } from "@/lib/site-nav";
import { ThemeToggle } from "./ThemeToggle";
import { CtaButton } from "./CtaButton";

type NavLink = { href: string; label: string };

type HeaderMobileMenuProps = {
  links: readonly NavLink[];
};

export function HeaderMobileMenu({ links }: HeaderMobileMenuProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, close]);

  return (
    <>
      <ThemeToggle />

      <button
        type="button"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden ${
          mobileOpen
            ? "border-brand/30 bg-brand-light text-brand dark:bg-brand-dark/30 dark:text-green-200"
            : "border-border bg-card text-foreground hover:bg-muted"
        }`}
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <div
        className={`fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        onClick={close}
      />

      <aside
        id="mobile-nav"
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(100%,19.5rem)] flex-col border-l border-border bg-card shadow-elevated transition-transform duration-300 ease-smooth lg:hidden ${
          mobileOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="border-b border-border bg-brand-light/30 px-5 py-4 dark:bg-brand-dark/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background ring-1 ring-brand/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={BRAND.logoIcon} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="truncate font-display text-small font-bold text-foreground">{BRAND.productName}</span>
            </div>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label="Close menu"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile">
          <p className="px-2 text-caption uppercase text-muted-foreground">Pages</p>
          <ul className="mt-2 space-y-1">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  tabIndex={mobileOpen ? 0 : -1}
                  className="flex items-center rounded-xl px-3 py-3 text-small font-medium text-foreground transition-colors hover:bg-brand-light/50 focus-visible:bg-brand-light/50 dark:hover:bg-brand-dark/20"
                  onClick={close}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-5 px-2 text-caption uppercase text-muted-foreground">On home page</p>
          <ul className="mt-2 space-y-1">
            {homeSectionLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  tabIndex={mobileOpen ? 0 : -1}
                  className="flex items-center rounded-xl px-3 py-3 text-small font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted"
                  onClick={close}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <CtaButton href="/contact" className="w-full rounded-full" onClick={close}>
            Get started
          </CtaButton>
        </div>
      </aside>
    </>
  );
}
