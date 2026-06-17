"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isForcePasswordChangePath } from "@/lib/tenantHost";
import { useAuthStore } from "@/store/authStore";
import { SessionLoadingScreen } from "@/components/auth/SessionLoadingScreen";

/** Redirect staff to mandatory password change before using the app. */
export function ForcePasswordChangeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || !user?.forcePasswordChange) return;
    if (user.role === "admin") return;
    if (isForcePasswordChangePath(pathname)) return;
    router.replace("/auth/change-password");
  }, [hydrated, user, pathname, router]);

  if (!hydrated) {
    return <SessionLoadingScreen />;
  }

  if (user?.forcePasswordChange && user.role !== "admin" && !isForcePasswordChangePath(pathname)) {
    return <SessionLoadingScreen fixedMessage="Taking you to password setup…" />;
  }

  return <>{children}</>;
}
