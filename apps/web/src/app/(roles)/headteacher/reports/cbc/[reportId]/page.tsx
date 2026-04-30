"use client";

import { useParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ReportCardPreview } from "@/components/reports/ReportCardPreview";

export default function HeadteacherCbcReportPreviewPage() {
  const params = useParams();
  const reportId = String(params["reportId"] ?? "");

  return (
    <PageWrapper title="CBC report preview" description="PDF preview">
      {reportId ? <ReportCardPreview reportId={reportId} /> : null}
    </PageWrapper>
  );
}
