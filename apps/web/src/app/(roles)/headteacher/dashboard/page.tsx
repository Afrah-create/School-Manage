"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { HeadteacherDashboardContent } from "@/components/headteacher/HeadteacherDashboardContent";
import { DashboardSkeleton } from "@/components/layout/shells/DashboardScaffold";
import { apiGet } from "@/lib/api";
import { useFeeInvoices } from "@/hooks/useFees";
import { combineQueryStatus } from "@/lib/queryStatus";

type Kpis = {
  activeStudents: string;
  totalFeesDue: string;
  totalFeesPaid: string;
  averageCbcNumeric: string;
  averageAlevelScore: string;
};

type TermRow = {
  id: string;
  termNumber?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

export default function HeadteacherDashboardPage() {
  const [kpisQ, termsQ] = useQueries({
    queries: [
      { queryKey: ["dashboard-kpis"], queryFn: () => apiGet<Kpis>("/analytics/dashboard") },
      { queryKey: ["terms"], queryFn: () => apiGet<TermRow[]>("/academic/terms") },
    ],
  });
  const invoicesQ = useFeeInvoices();

  const queries = [kpisQ, termsQ, invoicesQ];
  const status = combineQueryStatus(queries);
  const isFetching = queries.some((q) => q.isFetching && !q.isPending);
  const errorMessage =
    (kpisQ.error ?? termsQ.error ?? invoicesQ.error) instanceof Error
      ? (kpisQ.error ?? termsQ.error ?? invoicesQ.error)!.message
      : "Failed to load dashboard";

  const arrearsCount = useMemo(
    () => (invoicesQ.data ?? []).filter((r) => r.isFlagged && Number(r.balance) > 0).length,
    [invoicesQ.data],
  );

  return (
    <AsyncContent
      status={status}
      isFetching={isFetching}
      loading={<DashboardSkeleton />}
      error={
        <ErrorState
          message={errorMessage}
          onRetry={() => void Promise.all(queries.map((q) => q.refetch()))}
        />
      }
    >
      {kpisQ.data ? (
        <HeadteacherDashboardContent
          kpis={kpisQ.data}
          terms={termsQ.data ?? []}
          arrearsCount={arrearsCount}
        />
      ) : null}
    </AsyncContent>
  );
}
