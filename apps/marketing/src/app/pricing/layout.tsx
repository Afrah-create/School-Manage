import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Flexible plans for single schools and multi-campus groups. Contact us for a quote tailored to your school.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
