"use client";

import { FinancialTermReport } from "@/components/fees/FinancialTermReport";

export default function HeadteacherFeesReportsPage() {
  return (
    <FinancialTermReport
      readOnly
      studentBasePath="/headteacher/students"
      invoiceBasePath="/headteacher/fees/invoices"
      title="Term collection report"
      description="See how much was billed and collected for each term. Use this in staff meetings and guardian follow-ups."
    />
  );
}
