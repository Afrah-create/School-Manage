"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BRAND } from "@uganda-cbc-sms/brand";
import { homeSectionLinks } from "@/lib/site-nav";
import { BrandLogo } from "./BrandLogo";
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
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors lg:hidden ${
          mobileOpen
            ? "border-brand/30 bg-brand-light text-brand dark:bg-brand-dark/40 dark:text-green-200"
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
        className={`fixed inset-0 z-[59] bg-foreground/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
        onClick={close}
      />

      <div
        id="mobile-nav"
        className={`fixed inset-0 z-[60] flex flex-col bg-card transition-[visibility,opacity] duration-300 lg:hidden ${
          mobileOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="shrink-0 border-b border-border bg-card px-4 sm:px-6">
          <div className="mx-auto flex h-16 max-w-content items-center justify-between">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3 font-display text-small font-bold text-foreground sm:text-heading-3"
              onClick={close}
              tabIndex={mobileOpen ? 0 : -1}
            >
              <BrandLogo size="md" alt="" />
              <span className="truncate">{BRAND.productName}</span>
            </Link>
            <button
              type="button"
              onClick={close}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground transition-colors hover:bg-background"
              aria-label="Close menu"
              tabIndex={mobileOpen ? 0 : -1}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <nav
          className="mx-auto flex w-full max-w-content flex-1 flex-col justify-center bg-background px-4 py-8 sm:px-6"
          aria-label="Mobile"
        >
          <ul className="space-y-2">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  tabIndex={mobileOpen ? 0 : -1}
                  className="block rounded-2xl border border-border bg-card px-4 py-4 font-display text-heading-1 text-foreground shadow-card transition-colors hover:border-brand/25 hover:bg-brand-light/30 active:bg-brand-light/50 dark:hover:bg-brand-dark/20"
                  onClick={close}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-caption uppercase text-muted-foreground">Home sections</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {homeSectionLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  tabIndex={mobileOpen ? 0 : -1}
                  className="rounded-full border border-border bg-muted px-4 py-2 text-small font-medium text-foreground transition-colors hover:border-brand/30 hover:bg-brand-light/40 dark:hover:bg-brand-dark/25"
                  onClick={close}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="shrink-0 border-t border-border bg-card px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-content">
            <CtaButton href="/contact" className="w-full rounded-full py-3" onClick={close}>
              Get started
            </CtaButton>
          </div>
        </div>
      </div>
    </>
  );
}
