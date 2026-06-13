"use client";

import { ForcePasswordChangeGate } from "@/components/auth/ForcePasswordChangeGate";
import { AppShell } from "@/components/layout/shells/AppShell";
import { SHELL_NAV_CONFIG } from "@/components/layout/shells/navigation.config";
import type { RoleKey } from "@/components/layout/shells/types";
import { useAuthStore } from "@/store/authStore";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const config = user ? SHELL_NAV_CONFIG[user.role as RoleKey] : null;

  if (!config) {
    return <>{children}</>;
  }

  return (
    <ForcePasswordChangeGate>
      <AppShell config={config}>{children}</AppShell>
    </ForcePasswordChangeGate>
  );
}
