"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TenantBillingStatus } from "@uganda-cbc-sms/shared";
import { SchoolBillingPage } from "@/components/billing/SchoolBillingPage";
import { apiGet, apiPost, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

type PaymentRow = {
  id: string;
  amountUgx: number;
  status: string;
  periodLabel: string;
  paidAt: string | null;
  createdAt: string;
};

export function SchoolBillingClient() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const mockPayment = searchParams.get("mockPayment");
  const txRef = searchParams.get("tx_ref");
  const statusReturn = searchParams.get("status");

  const billingQ = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiGet<TenantBillingStatus>("/billing/status"),
  });

  const paymentsQ = useQuery({
    queryKey: ["billing-payments"],
    queryFn: () => apiGet<PaymentRow[]>("/billing/payments"),
  });

  useEffect(() => {
    if (statusReturn === "return" && txRef) {
      void apiGet<{ billing: TenantBillingStatus }>(
        `/billing/verify-return?tx_ref=${encodeURIComponent(txRef)}`,
      ).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["billing-status"] });
        toast.success("Payment verified.", "Subscription");
      });
    }
  }, [statusReturn, txRef, queryClient]);

  const payM = useMutation({
    mutationFn: async () => {
      const periodId = billingQ.data?.currentPeriod?.id;
      if (!periodId) throw new Error("No payable invoice.");
      return apiPost<{ checkoutUrl: string; paymentId: string }>("/billing/checkout", {
        billingPeriodId: periodId,
      });
    },
    onSuccess: (data) => {
      if (mockPayment || data.checkoutUrl.includes("mockPayment=")) {
        void mockM.mutate(data.paymentId);
        return;
      }
      window.location.href = data.checkoutUrl;
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Payment"),
  });

  const mockM = useMutation({
    mutationFn: (paymentId: string) =>
      apiPost(`/billing/mock-complete/${paymentId}`, {}),
    onSuccess: () => {
      toast.success("Test payment completed.", "Subscription");
      void queryClient.invalidateQueries({ queryKey: ["billing-status"] });
      void queryClient.invalidateQueries({ queryKey: ["billing-payments"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e), "Payment"),
  });

  useEffect(() => {
    if (mockPayment) void mockM.mutate(mockPayment);
  }, [mockPayment]);

  if (billingQ.isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">Loading subscription…</p>;
  }

  const billing = billingQ.data;
  if (!billing) {
    return <p className="p-8 text-sm text-red-600">Could not load subscription status.</p>;
  }

  return (
    <SchoolBillingPage
      billing={billing}
      paying={payM.isPending || mockM.isPending}
      history={paymentsQ.data ?? []}
      onPay={() => payM.mutate()}
      onMockComplete={
        billing.currentPeriod && process.env.NODE_ENV === "development"
          ? () => {
              if (mockM.isPending || payM.isPending) return;
              void payM.mutate();
            }
          : undefined
      }
    />
  );
}
