"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { PipelineData } from "@/components/reports/charts/ReportPipelineCharts";

export type ReportsOverview = {
  pipeline: PipelineData;
  performance: {
    cbc: Array<{ name: string; rating: string; cnt: number }>;
    alevel: Array<{ name: string; avg_score: string }>;
  };
  readiness: {
    cbc: Array<{
      subject_id: string;
      subject_name: string;
      subject_code: string;
      teacher_name: string | null;
      status: string;
    }>;
    alevel: Array<{
      subject_id: string;
      subject_name: string;
      subject_code: string;
      teacher_name: string | null;
      status: string;
    }>;
  };
  divisions: Array<{ division: string; cnt: number }>;
  kpis: {
    activeStudents: string;
    totalFeesDue: string;
    totalFeesPaid: string;
    averageCbcNumeric: string;
    averageAlevelScore: string;
  };
};

export function useReportsOverview(filters: { classId: string; termId: string; yearId: string }) {
  const qp = new URLSearchParams({
    classId: filters.classId,
    termId: filters.termId,
    yearId: filters.yearId,
  });
  return useQuery({
    queryKey: ["reports-overview", filters],
    queryFn: () => apiGet<ReportsOverview>(`/analytics/reports-overview?${qp.toString()}`),
    enabled: Boolean(filters.classId && filters.termId && filters.yearId),
  });
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () =>
      apiGet<{
        activeStudents: string;
        averageCbcNumeric: string;
        averageAlevelScore: string;
      }>("/analytics/dashboard"),
  });
}
