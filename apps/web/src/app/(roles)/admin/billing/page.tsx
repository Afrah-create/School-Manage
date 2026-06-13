import { Suspense } from "react";
import { BillingPaywallShell } from "@/components/billing/BillingPaywallShell";
import { SchoolBillingClient } from "@/components/billing/SchoolBillingClient";

export default function AdminBillingPage() {
  return (
    <BillingPaywallShell>
      <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading…</p>}>
        <SchoolBillingClient />
      </Suspense>
    </BillingPaywallShell>
  );
}