import Link from "next/link";
import { BRAND } from "@uganda-cbc-sms/brand";
import { Container } from "@/components/Container";
import { CtaBanner } from "@/components/CtaBanner";
import { CtaButton } from "@/components/CtaButton";
import { CurriculumComparison } from "@/components/CurriculumComparison";
import { SoftwareApplicationJsonLd, WebSiteJsonLd } from "@/components/JsonLd";
import { HomeFaqSection } from "@/components/HomeFaqSection";
import { HomePricingSection } from "@/components/HomePricingSection";
import { ImageReveal } from "@/components/ImageReveal";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { RoleShowcase } from "@/components/RoleShowcase";
import { SectionHeading } from "@/components/SectionHeading";
import { IconAlevel, IconCbc, IconFees, IconRoles } from "@/components/icons";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "SchoolManage",
  description:
    "SchoolManage helps Ugandan secondary schools manage students, O-Level CBC assessments, A-Level UNEB grading, fees in UGX, and report cards on one platform.",
  path: "/",
});

const highlights = [
  {
    title: "O-Level CBC assessment",
    description:
      "Record strand and competency ratings (A to E), project work, and end-of-cycle exams. CA and composite grades follow NCDC policy.",
    icon: IconCbc,
    accent: "brand" as const,
  },
  {
    title: "A-Level UNEB grading",
    description:
      "Enter numerical scores and the system converts them to UNEB grades, points, and divisions for UACE reporting.",
    icon: IconAlevel,
    accent: "accent" as const,
  },
  {
    title: "Fees in Ugandan shillings",
    description:
      "Set fee structures, issue invoices, and record cash or mobile money payments with balances and reports for your bursar.",
    icon: IconFees,
    accent: "brand" as const,
  },
  {
    title: "Role-based access",
    description:
      "Separate dashboards for administrators, headteachers, class teachers, subject teachers, and bursars.",
    icon: IconRoles,
    accent: "brand" as const,
  },
] as const;

const accentIconBg = {
  brand: "bg-brand-light text-brand dark:bg-brand-dark/40 dark:text-green-200",
  accent: "bg-accent-light text-accent dark:bg-accent-deep/40 dark:text-blue-200",
};

const steps = [
  {
    step: "1",
    title: "Enrol students",
    description: "Add learners, assign classes, and keep student records in one place instead of paper files.",
  },
  {
    step: "2",
    title: "Enter scores",
    description:
      "Teachers record CBC ratings and project work for O-Level, or exam marks for A-Level. Assessments can be submitted for review.",
  },
  {
    step: "3",
    title: "Generate report cards",
    description:
      "Produce CBC or A-Level report cards as PDFs. Headteachers review and approve before printing or sharing.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <WebSiteJsonLd />
      <SoftwareApplicationJsonLd />
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-grid-subtle bg-grid" aria-hidden />
        <Container className="relative grid items-center gap-10 py-section-sm lg:grid-cols-2 lg:gap-14 lg:py-section">
          <RevealOnScroll>
            <div className="max-w-xl">
              <p className="eyebrow">Ugandan secondary schools</p>
              <h1 className="mt-3 text-balance text-display-1">
                Replace paper records with one CBC and UNEB-ready system
              </h1>
              <p className="mt-5 text-body-lg text-muted-foreground">
                {BRAND.productName} helps your school manage students, assessments, fees, and report cards. Built for
                O-Level CBC (S1 to S4) and A-Level UNEB (S5 to S6) on one platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CtaButton href="/contact">See it in action</CtaButton>
                <Link href="/features" className="btn-secondary">
                  View features
                </Link>
              </div>
            </div>
          </RevealOnScroll>
          <ImageReveal
            src="/images/Hero.webp"
            alt="School administrator reviewing the SchoolManage dashboard on a laptop in the office"
            variant="hero"
            priority
            delay={80}
            sizes="(max-width: 1024px) 100vw, 560px"
            className="aspect-[4/3] lg:aspect-[5/4]"
          />
        </Container>
      </section>

      <section className="section-pad">
        <Container>
          <RevealOnScroll>
            <SectionHeading
              eyebrow="Curriculum"
              title="Two tracks, one platform"
              description="O-Level and A-Level follow different grading rules. SchoolManage keeps them separate but connected."
            />
          </RevealOnScroll>
          <RevealOnScroll className="mt-10" delay={80}>
            <CurriculumComparison />
          </RevealOnScroll>
        </Container>
      </section>

      <RoleShowcase />

      <section className="section-pad border-y border-border bg-neutral-50 dark:bg-neutral-950/50">
        <Container>
          <RevealOnScroll>
            <SectionHeading
              eyebrow="Capabilities"
              title="What the system covers"
              description="Competency-based O-Level assessment, UNEB point calculations at A-Level, fees, attendance, and role-based dashboards."
            />
          </RevealOnScroll>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {highlights.map(({ title, description, icon: Icon, accent }, i) => (
              <RevealOnScroll key={title} delay={i * 60}>
                <article className="surface-card-interactive h-full p-6">
                  <span className={`inline-flex rounded-lg p-2.5 ${accentIconBg[accent]}`}>
                    <Icon />
                  </span>
                  <h3 className="mt-4 text-heading-2">{title}</h3>
                  <p className="mt-2 text-small text-muted-foreground">{description}</p>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-pad">
        <Container>
          <RevealOnScroll>
            <SectionHeading
              align="center"
              eyebrow="Workflow"
              title="How it works"
              description="Three steps from enrolment to approved report cards."
              className="mx-auto max-w-xl"
            />
          </RevealOnScroll>
          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            {steps.map(({ step, title, description }, i) => (
              <RevealOnScroll key={step} delay={i * 80}>
                <li className="md:text-center">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand font-display text-small font-bold text-white shadow-card">
                    {step}
                  </span>
                  <h3 className="mt-4 text-heading-2">{title}</h3>
                  <p className="mt-2 text-small text-muted-foreground">{description}</p>
                </li>
              </RevealOnScroll>
            ))}
          </ol>
        </Container>
      </section>

      <HomePricingSection />

      <HomeFaqSection />

      <CtaBanner
        title="Ready to move beyond paper records?"
        description="Book a walkthrough for your school, or sign in if you already have an account."
        primaryLabel="See it in action"
        primaryHref="/contact"
        secondaryLabel="View pricing"
        secondaryHref="/#pricing"
      />
    </>
  );
}
