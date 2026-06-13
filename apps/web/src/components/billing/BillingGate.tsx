"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { TenantBillingStatus } from "@uganda-cbc-sms/shared";
import { apiGet } from "@/lib/api";
import { billingPageForRole } from "@/lib/billingPaths";
import { useAuthStore } from "@/store/authStore";

const PAYMENT_ROLES = new Set(["admin", "headteacher"]);

export function BillingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  const billingQ = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiGet<TenantBillingStatus>("/billing/status"),
    enabled: Boolean(hydrated && user && PAYMENT_ROLES.has(user.role)),
    staleTime: 30_000,
  });

  const billing = billingQ.data;
  const billingPath = user ? billingPageForRole(user.role) : null;
  const onBillingPage = billingPath ? pathname.startsWith(billingPath) : false;

  useEffect(() => {
    if (!hydrated || !user || !PAYMENT_ROLES.has(user.role)) return;
    if (!billing || billing.canUseApp) return;
    if (onBillingPage) return;
    if (billingPath) router.replace(billingPath);
  }, [hydrated, user, billing, onBillingPage, billingPath, router]);

  if (!hydrated || (PAYMENT_ROLES.has(user?.role ?? "") && billingQ.isLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user && PAYMENT_ROLES.has(user.role) && billing && !billing.canUseApp && !onBillingPage) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting to subscription payment…</p>
      </div>
    );
  }

  return <>{children}</>;
}
