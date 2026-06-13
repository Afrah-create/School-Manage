import { ForcePasswordChangeGate } from "@/components/auth/ForcePasswordChangeGate";
import { AppShell } from "@/components/layout/shells/AppShell";
import { SHELL_NAV_CONFIG } from "@/components/layout/shells/navigation.config";

export default function BursarLayout({ children }: { children: React.ReactNode }) {
  return (
    <ForcePasswordChangeGate>
      <AppShell config={SHELL_NAV_CONFIG.bursar}>{children}</AppShell>
    </ForcePasswordChangeGate>
  );
}
