"use client";

import { useQuery } from "@tanstack/react-query";
import type { TenantBillingStatus } from "@uganda-cbc-sms/shared";
import { apiGet } from "@/lib/api";
import { canPaySubscription } from "@/lib/billingPaths";
import { SubscriptionBlockedScreen } from "@/components/billing/SchoolBillingPage";
import { useAuthStore } from "@/store/authStore";

export function StaffSubscriptionGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  const billingQ = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiGet<TenantBillingStatus>("/billing/status"),
    enabled: Boolean(hydrated && user && !canPaySubscription(user.role)),
    staleTime: 30_000,
  });

  if (!hydrated || (user && !canPaySubscription(user.role) && billingQ.isLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user && !canPaySubscription(user.role) && billingQ.data && !billingQ.data.canUseApp) {
    return <SubscriptionBlockedScreen billing={billingQ.data} />;
  }

  return <>{children}</>;
}
