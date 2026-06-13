import { AppShell } from "@/components/layout/shells/AppShell";
import { ForcePasswordChangeGate } from "@/components/auth/ForcePasswordChangeGate";
import { SHELL_NAV_CONFIG } from "@/components/layout/shells/navigation.config";

export default function HeadteacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <ForcePasswordChangeGate>
      <AppShell config={SHELL_NAV_CONFIG.headteacher}>{children}</AppShell>
    </ForcePasswordChangeGate>
  );
}
