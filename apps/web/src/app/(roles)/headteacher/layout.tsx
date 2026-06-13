"use client";

import { AppShell } from "@/components/layout/shells/AppShell";
import { ForcePasswordChangeGate } from "@/components/auth/ForcePasswordChangeGate";
import { BillingGate } from "@/components/billing/BillingGate";
import { SHELL_NAV_CONFIG } from "@/components/layout/shells/navigation.config";
import { usePathname } from "next/navigation";

export default function HeadteacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBilling = pathname?.startsWith("/headteacher/billing");

  if (isBilling) {
    return <>{children}</>;
  }

  return (
    <ForcePasswordChangeGate>
      <BillingGate>
        <AppShell config={SHELL_NAV_CONFIG.headteacher}>{children}</AppShell>
      </BillingGate>
    </ForcePasswordChangeGate>
  );
}
