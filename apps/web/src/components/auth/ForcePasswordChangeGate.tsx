"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isForcePasswordChangePath } from "@/lib/tenantHost";
import { useAuthStore } from "@/store/authStore";

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
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user?.forcePasswordChange && user.role !== "admin" && !isForcePasswordChangePath(pathname)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting to password setup…</p>
      </div>
    );
  }

  return <>{children}</>;
}
