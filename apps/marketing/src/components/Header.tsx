"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND } from "@uganda-cbc-sms/brand";
import { mainNavLinks } from "@/lib/site-nav";
import { BrandLogo } from "./BrandLogo";
import { Container } from "./Container";
import { HeaderMobileMenu } from "./HeaderMobileMenu";
import { CtaButton } from "./CtaButton";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-1 z-50 border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-border bg-background/95 shadow-card backdrop-blur-lg"
          : "border-border/50 bg-background/75 backdrop-blur-md"
      }`}
    >
      <Container>
        <div className="grid h-16 grid-cols-[1fr_auto] items-center gap-3 lg:h-[4.25rem] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 justify-self-start font-display text-heading-3 font-bold text-foreground"
          >
            <BrandLogo size="md" />
            <span className="truncate text-small font-bold sm:text-heading-3">{BRAND.productName}</span>
          </Link>

          <nav
            className="hidden items-center justify-center gap-0.5 rounded-full border border-border/80 bg-card/60 p-1 lg:flex"
            aria-label="Main"
          >
            {mainNavLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-full px-4 py-2 text-small font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2 justify-self-end">
            <CtaButton href="/contact" className="hidden rounded-full px-5 sm:inline-flex">
              Get started
            </CtaButton>
            <HeaderMobileMenu links={mainNavLinks} />
          </div>
        </div>
      </Container>
    </header>
  );
}
