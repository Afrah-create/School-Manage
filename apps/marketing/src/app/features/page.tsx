import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { CheckIcon } from "@/components/CheckIcon";
import { PageHero } from "@/components/PageHero";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { createPageMetadata } from "@/lib/seo";
import {
  IconAcademic,
  IconAlevel,
  IconCbc,
  IconFees,
  IconReports,
  IconStudents,
} from "@/components/icons";

export const metadata: Metadata = createPageMetadata({
  title: "Features",
  description:
    "Explore SchoolManage features: academic structure, student management, O-Level CBC assessment, A-Level UNEB grading, fees in Ugandan shillings, and PDF report cards.",
  path: "/features",
});

const sections = [
  {
    id: "academic-structure",
    title: "Academic Structure",
    description:
      "Set up your school year once and reuse it across the system. Define academic years and terms, create classes, assign subjects and A-Level combinations, and configure CBC strands and grading scales — so every assessment and report pulls from the same structure.",
    bullets: [
      "Manage academic years, terms, classes, and subjects",
      "Configure A-Level subject combinations per class",
      "Maintain CBC strands linked to subjects",
      "Apply O-Level CBC and A-Level UNEB grading scale defaults",
    ],
    icon: IconAcademic,
    variant: "neutral" as const,
  },
  {
    id: "student-management",
    title: "Student Management",
    description:
      "Keep every learner's record in one place — from first enrolment through promotion and withdrawal. Search by name or student number, attach photos, and browse students by class for teachers and administrators.",
    bullets: [
      "Enrol new students with structured student numbers",
      "Promote learners between classes and academic years",
      "Record withdrawals and keep historical records",
      "Upload student photos and search across the school",
    ],
    icon: IconStudents,
    variant: "neutral" as const,
  },
  {
    id: "cbc-assessment",
    title: "Competency & grading (O-Level)",
    description:
      "Support NCDC-aligned O-Level assessment: teachers record competency levels on the four-point descriptor scale (Exceeds, Meets, Approaching, and Below Expectations), enter scored project work for continuous assessment, and add end-of-cycle exam marks. The system computes CA, EOC, and composite A–E final grades, and tracks Result 1 / 2 / 3 certification status.",
    bullets: [
      "Record NCDC competency levels per assessment activity and strand",
      "Enter project work scores that feed official continuous assessment",
      "Compute 20/80 CA + EOC composites with configurable weights",
      "Headteachers review term summaries; legacy sheet unlock available for pre-migration data",
    ],
    icon: IconCbc,
    variant: "brand" as const,
  },
  {
    id: "alevel-assessment",
    title: "A-Level Assessment (UNEB)",
    description:
      "A-Level assessment follows UNEB conventions. Teachers enter numerical exam scores; the system converts them to grades (A–F), points (1–9), and combination divisions (I–IV) using the standard UNEB tables.",
    bullets: [
      "Auto-converts scores to UNEB grades and points",
      "Calculates combination divisions from aggregate points",
      "Separate assessment flows for S5 and S6 learners",
      "Supports formal exam entry alongside class assessment",
    ],
    icon: IconAlevel,
    variant: "accent" as const,
  },
  {
    id: "fees-management",
    title: "Fees Management",
    description:
      "Give your bursar a dedicated workspace for school finances in Ugandan shillings. Set fee structures by class and term, generate invoices in bulk, record payments, and view balances and collection reports.",
    bullets: [
      "Define fee schedules per class and term",
      "Issue and track invoices with payment status",
      "Record cash and mobile money payments with transaction references",
      "View per-student balances and financial summary reports",
    ],
    icon: IconFees,
    variant: "neutral" as const,
  },
  {
    id: "reporting-analytics",
    title: "Reporting & Analytics",
    description:
      "Turn entered data into report cards and school-wide insights. Generate CBC or A-Level report cards as PDFs, route them through headteacher approval, and monitor class performance and report pipeline status from analytics dashboards.",
    bullets: [
      "Generate O-Level CBC and A-Level UNEB report card PDFs",
      "Headteacher approval workflow before reports are finalised",
      "Dashboard KPIs for enrolment, fees, and assessment progress",
      "Class performance and report-pipeline overviews for leadership",
    ],
    icon: IconReports,
    variant: "neutral" as const,
  },
] as const;

const variantStyles = {
  neutral: {
    icon: "bg-muted text-foreground",
    border: "border-border",
    check: "brand" as const,
  },
  brand: {
    icon: "bg-brand-light text-brand dark:bg-brand-dark/40 dark:text-green-200",
    border: "border-brand/20",
    check: "brand" as const,
  },
  accent: {
    icon: "bg-accent-light text-accent dark:bg-accent-deep/40 dark:text-blue-200",
    border: "border-accent/20",
    check: "accent" as const,
  },
};

export default function FeaturesPage() {
  return (
    <div className="page-pad">
      <Container>
        <PageHero
          eyebrow="Modules"
          title="Everything your school needs in one system"
          description="Modules aligned to how Ugandan secondary schools actually run — from academic setup through assessment, fees, and approved report cards."
        />

        <div className="space-y-16 md:space-y-20">
          {sections.map(({ id, title, description, bullets, icon: Icon, variant }, index) => {
            const styles = variantStyles[variant];

            return (
              <RevealOnScroll key={id} delay={40}>
                <section
                  id={id}
                  className={`grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12 ${
                    index % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""
                  }`}
                >
                  <div>
                    <span className={`inline-flex rounded-xl p-3 ${styles.icon}`}>
                      <Icon className="h-7 w-7" />
                    </span>
                    <h2 className="mt-4 text-heading-1">{title}</h2>
                    <p className="mt-3 text-body text-muted-foreground">{description}</p>
                  </div>
                  <ul className={`surface-card space-y-3 p-6 ${styles.border}`}>
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-small text-foreground">
                        <CheckIcon variant={styles.check} />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </section>
              </RevealOnScroll>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
