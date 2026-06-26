import Link from "next/link";
import { pricingTiers } from "@/lib/pricing-data";
import { CheckIcon } from "./CheckIcon";
import { Container } from "./Container";
import { RevealOnScroll } from "./RevealOnScroll";
import { SectionHeading } from "./SectionHeading";

export function HomePricingSection() {
  return (
    <section id="pricing" className="section-pad scroll-mt-20 border-y border-border">
      <Container>
        <RevealOnScroll>
          <SectionHeading
            eyebrow="Plans"
            title="Plans that fit your school"
            description="Flexible tiers based on your size and the modules you need. Every plan is quoted individually."
            align="center"
            className="mx-auto max-w-2xl"
          />
        </RevealOnScroll>

        <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {pricingTiers.map((tier, i) => {
            const highlighted = "highlighted" in tier && tier.highlighted;

            return (
              <RevealOnScroll key={tier.name} delay={i * 70} className="h-full">
                <article
                  className={`flex h-full flex-col rounded-2xl border p-6 md:p-7 ${
                    highlighted
                      ? "border-brand bg-brand-light/25 shadow-elevated ring-1 ring-brand/15 dark:bg-brand-dark/15"
                      : "surface-card"
                  }`}
                >
                  {highlighted ? (
                    <span className="mb-3 inline-flex w-fit rounded-full bg-brand px-2.5 py-0.5 text-caption text-white">
                      Most popular
                    </span>
                  ) : null}
                  <h3 className="text-heading-1">{tier.name}</h3>
                  <p className="mt-2 text-small text-muted-foreground">{tier.description}</p>
                  <p className="mt-5 font-display text-heading-2 text-foreground">Contact us for a quote</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5 text-small text-foreground">
                        <CheckIcon className="h-4 w-4" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className={`mt-8 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-small font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      highlighted
                        ? "bg-brand text-white hover:bg-brand-dark focus-visible:outline-brand"
                        : "btn-secondary w-full"
                    }`}
                  >
                    Contact us for a quote
                  </Link>
                </article>
              </RevealOnScroll>
            );
          })}
        </div>

        <RevealOnScroll className="mt-10" delay={100}>
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-muted/40 px-6 py-6 text-center">
            <h3 className="text-heading-2">How is pricing calculated?</h3>
            <p className="mt-2 text-small text-muted-foreground">
              Pricing depends on student count and modules enabled. A small day school with CBC only will differ from a
              large campus running fees, A-Level, attendance, and analytics. Tell us your enrolment and priorities on
              the{" "}
              <Link href="/contact" className="link-brand">
                contact page
              </Link>{" "}
              and we will prepare a quote.
            </p>
          </div>
        </RevealOnScroll>
      </Container>
    </section>
  );
}
