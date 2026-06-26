import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@uganda-cbc-sms/brand";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description: `Terms of service for using ${BRAND.productName}, the school management platform for Ugandan secondary schools.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="page-pad">
      <Container className="max-w-3xl">
        <PageHero
          eyebrow="Legal"
          title="Terms of Service"
          description={`Terms governing use of ${BRAND.productName} provided by ${BRAND.companyName}.`}
        />

      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>Placeholder notice:</strong> This is placeholder text — replace with reviewed legal copy before launch.
        Do not treat this page as final or legally binding.
      </div>

      <article className="mt-8 max-w-3xl space-y-8 text-muted-foreground">
        <p className="text-sm">Last updated: placeholder date</p>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">1. Agreement</h2>
          <p>
            By accessing or using {BRAND.productName}, you agree to these Terms of Service on behalf of your school or
            organisation. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">2. Service description</h2>
          <p>
            {BRAND.productName} is a web-based school management system for Ugandan secondary schools, including modules
            for academic structure, student records, O-Level CBC assessment, A-Level UNEB assessment, fees, attendance,
            reporting, and related features as enabled for your school.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">3. Accounts and acceptable use</h2>
          <p>
            Schools are responsible for accounts they create, password hygiene, and ensuring staff use the system only for
            legitimate school purposes. You must not attempt to access another school&apos;s data, interfere with platform
            security, or use the service in violation of applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">4. Data protection</h2>
          <p>
            Processing of personal data is subject to our{" "}
            <Link href="/privacy" className="font-medium text-brand hover:underline">
              Privacy Policy
            </Link>{" "}
            and the <strong className="text-foreground">Uganda Data Protection and Privacy Act, 2019</strong>. Schools
            remain responsible for lawful basis, notices to parents and staff, and accuracy of data they enter.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">5. Fees and payment</h2>
          <p>
            Subscription fees, billing cycles, and payment terms are set out in your separate quotation or service
            agreement. Module availability may depend on your plan and selected modules.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">6. Availability and support</h2>
          <p>
            We strive to keep the service available during school operating hours but do not guarantee uninterrupted
            access. Planned maintenance and support response times should be documented in your service agreement.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">7. Intellectual property</h2>
          <p>
            {BRAND.companyName} retains ownership of the {BRAND.productName} software, branding, and documentation.
            Schools retain ownership of the data they input. A licence to use the platform is granted for the subscription
            term.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">8. Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, {BRAND.companyName}&apos;s liability is limited as set out in your
            executed service agreement. Assessment outcomes remain the school&apos;s responsibility; the system applies
            configured grading rules but does not replace professional academic judgement or official UNEB/NCDC processes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">9. Changes and termination</h2>
          <p>
            We may update these Terms with notice as appropriate. Schools may terminate per their agreement; upon
            termination, data export and deletion procedures should follow the contract and applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">10. Contact</h2>
          <p>
            Questions about these Terms: contact {BRAND.companyName} via the{" "}
            <Link href="/contact" className="font-medium text-brand hover:underline">
              contact page
            </Link>
            .
          </p>
        </section>
      </article>
      </Container>
    </div>
  );
}
