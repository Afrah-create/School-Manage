"use client";

import { FinancialTermReport } from "@/components/fees/FinancialTermReport";

export default function BursarFinancialReportsPage() {
  return (
    <FinancialTermReport
      title="Term financial report"
      description="Billing and collections by term. Export CSV for records or reconciliation."
    />
  );
}
