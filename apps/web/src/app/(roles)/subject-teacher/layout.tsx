"use client";

import { ForcePasswordChangeGate } from "@/components/auth/ForcePasswordChangeGate";
import { StaffSubscriptionGate } from "@/components/billing/StaffSubscriptionGate";
import { AppShell } from "@/components/layout/shells/AppShell";
import { SHELL_NAV_CONFIG } from "@/components/layout/shells/navigation.config";

export default function SubjectTeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <ForcePasswordChangeGate>
      <StaffSubscriptionGate>
        <AppShell config={SHELL_NAV_CONFIG["subject-teacher"]}>{children}</AppShell>
      </StaffSubscriptionGate>
    </ForcePasswordChangeGate>
  );
}
