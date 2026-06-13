"use client";

import { AppShell } from "@/components/layout/shells/AppShell";
import { BillingGate } from "@/components/billing/BillingGate";
import { AdminOnboardingGate } from "@/components/onboarding/AdminOnboardingGate";
import { SHELL_NAV_CONFIG } from "@/components/layout/shells/navigation.config";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith("/admin/onboarding");
  const isBilling = pathname?.startsWith("/admin/billing");

  if (isOnboarding || isBilling) {
    return <>{children}</>;
  }

  return (
    <AdminOnboardingGate>
      <BillingGate>
        <AppShell config={SHELL_NAV_CONFIG.admin}>{children}</AppShell>
      </BillingGate>
    </AdminOnboardingGate>
  );
}
