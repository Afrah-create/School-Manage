import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@uganda-cbc-sms/brand";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: `Read how ${BRAND.productName} by ${BRAND.companyName} collects, uses, and protects school and user data.`,
  path: "/privacy",
});

const listClass = "mt-2 list-disc space-y-1 pl-5";

export default function PrivacyPage() {
  return (
    <div className="page-pad">
      <Container className="max-w-3xl">
        <PageHero
          eyebrow="Legal"
          title="Privacy Policy"
          description={`How ${BRAND.companyName} handles personal data when you use ${BRAND.productName}.`}
        />

      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>Placeholder notice:</strong> This is placeholder text — replace with reviewed legal copy before launch.
        Do not treat this page as final or legally binding.
      </div>

      <article className="mt-8 max-w-3xl space-y-8 text-muted-foreground">
        <p className="text-sm">Last updated: placeholder date</p>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">1. Introduction</h2>
          <p>
            {BRAND.companyName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates {BRAND.productName}, a school management
            platform used by Ugandan secondary schools. This Privacy Policy explains how we collect, use, store, and
            protect personal information processed through the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">2. Data we process</h2>
          <p>Depending on how your school uses the platform, we may process:</p>
          <ul className={listClass}>
            <li>Staff account details (name, email, role, login activity)</li>
            <li>Student records (name, class, assessment results, attendance, photos where uploaded)</li>
            <li>Fee and payment information recorded by the school</li>
            <li>Technical logs (IP address, browser type, and sign-in activity for security)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">3. Legal framework</h2>
          <p>
            We aim to comply with the <strong className="text-foreground">Uganda Data Protection and Privacy Act, 2019</strong>{" "}
            and applicable regulations. Schools using {BRAND.productName} act as data controllers for their learners and
            staff; {BRAND.companyName} typically acts as a data processor when hosting the service on the school&apos;s
            behalf. Specific controller/processor arrangements should be confirmed in your service agreement.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">4. How we use data</h2>
          <p>Personal data is used to:</p>
          <ul className={listClass}>
            <li>Provide and maintain the school management service</li>
            <li>Authenticate users and enforce role-based access</li>
            <li>Generate academic and financial reports requested by authorised staff</li>
            <li>Protect the security and integrity of the platform</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">5. Data retention and security</h2>
          <p>
            Data is retained for as long as the school&apos;s account is active and as required by applicable law or
            contractual obligations. We apply technical measures including access controls, separation of school data,
            and encrypted connections in production. Details of retention periods and subprocessors should be added here
            after legal review.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">6. Your rights</h2>
          <p>
            Under the Uganda Data Protection and Privacy Act, 2019, data subjects may have rights to access, rectify, or
            erase personal data, subject to lawful exceptions. Schools should direct learner and parent requests through
            their own data protection contact; {BRAND.companyName} will assist schools as processor where applicable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">7. Contact</h2>
          <p>
            For privacy enquiries, contact {BRAND.companyName} via the{" "}
            <Link href="/contact" className="font-medium text-brand hover:underline">
              contact page
            </Link>{" "}
            pending appointment of a formal data protection contact.
          </p>
        </section>
      </article>
      </Container>
    </div>
  );
}
