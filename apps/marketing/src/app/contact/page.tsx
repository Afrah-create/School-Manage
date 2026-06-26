import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { ContactChannels } from "@/components/ContactChannels";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { RevealOnScroll } from "@/components/RevealOnScroll";

export const metadata: Metadata = {
  title: "Contact",
  description: "Request a demo, ask about pricing, or get help setting up SchoolManage for your school.",
};

const tips = [
  {
    title: "What to include",
    body: "School name, approximate student count, and whether you need O-Level CBC, A-Level UNEB, fees, or all modules.",
  },
  {
    title: "Existing customers",
    body: "Use this form for billing or support, or sign in to your school portal to work in the system.",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="page-pad">
      <Container className="max-w-5xl">
        <RevealOnScroll>
          <PageHero
            centered
            eyebrow="Enquiries"
            title="Get in touch"
            description="Book a walkthrough, request a quote, or ask about CBC and UNEB setup for your school."
          />
        </RevealOnScroll>

        <RevealOnScroll delay={60} className="mt-10 md:mt-12">
          <ContactChannels />
        </RevealOnScroll>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-10">
          <RevealOnScroll delay={100}>
            <ContactForm />
          </RevealOnScroll>

          <RevealOnScroll delay={140}>
            <aside className="space-y-4 lg:sticky lg:top-24">
              {tips.map((tip) => (
                <div key={tip.title} className="rounded-xl border border-border bg-muted/30 p-5">
                  <h2 className="text-small font-semibold text-foreground">{tip.title}</h2>
                  <p className="mt-2 text-small leading-relaxed text-muted-foreground">{tip.body}</p>
                </div>
              ))}
            </aside>
          </RevealOnScroll>
        </div>
      </Container>
    </div>
  );
}
