import Link from "next/link";
import { BRAND } from "@uganda-cbc-sms/brand";
import { homeSectionLinks, legalLinks, mainNavLinks } from "@/lib/site-nav";
import { BrandLogo } from "./BrandLogo";
import { Container } from "./Container";

function FooterLinkGroup({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="text-small text-foreground/80 transition-colors hover:text-brand">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-neutral-50 dark:bg-neutral-950">
      <Container className="py-12 md:py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="max-w-xs shrink-0">
            <Link href="/" className="inline-flex items-center gap-3 font-display text-heading-3 font-bold text-foreground">
              <BrandLogo size="md" />
              {BRAND.productName}
            </Link>
            <p className="mt-4 text-small leading-relaxed text-muted-foreground">
              {BRAND.companyTagline} O-Level CBC and A-Level UNEB on one platform for Ugandan secondary schools.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10 lg:gap-14">
            <FooterLinkGroup title="Product" links={mainNavLinks} />
            <FooterLinkGroup title="Sections" links={homeSectionLinks} />
            <FooterLinkGroup title="Legal" links={legalLinks} />
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-small text-muted-foreground">
          <p>
            &copy; {year} {BRAND.companyName}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
