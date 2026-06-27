"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";

export default function AdminAssessmentHubPage() {
  return (
    <PageWrapper
      title="Assessment"
      description="Policy setup and execution for O-Level CBC and A-Level UNEB workflows."
    >
      <p className="-mt-2 mb-6 text-sm text-muted-foreground">
        O-Level follows the UNEB/NCDC CBC flow:{" "}
        <strong className="font-medium text-foreground">NCDC 4-level competency ratings</strong> +{" "}
        <strong className="font-medium text-foreground">formal exam EOC</strong> +{" "}
        <strong className="font-medium text-foreground">project completion</strong> to produce composite grades and Result
        1/2/3 certification.
      </p>

      <Card title="Policy setup">
        <p className="text-sm text-muted-foreground">
          Configure school policy first:{" "}
          <Link href="/admin/assessment/rules" className="font-medium text-brand hover:underline">
            Assessment rules
          </Link>{" "}
          for CA conversion (20/80, compulsory subjects), and{" "}
          <Link href="/admin/academic/grading-scales" className="font-medium text-brand hover:underline">
            Grading scales
          </Link>
          {" "}for O-Level A–E cut-points and A-Level UNEB points.
        </p>
      </Card>

      <Card title="Documentation">
        <p className="text-sm text-muted-foreground">
          Role-by-role CBC workflow (admin setup through class teacher entry and headteacher review):{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">docs/cbc-workflow-role-guide.md</code>.
          Technical API reference:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">docs/api-cbc-competency-endpoints.md</code>.
          Policy and grading detail:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">docs/uganda-cbc-assessment.md</code>.
        </p>
      </Card>

      <Card title="Execution workflow">
        <p className="text-sm text-muted-foreground">
          Teachers enter{" "}
          <Link href="/admin/assessment/cbc" className="font-medium text-brand hover:underline">
            CBC term summaries
          </Link>{" "}
          (read-only oversight) and{" "}
          ratings and <Link href="/admin/exams" className="font-medium text-brand hover:underline">formal exam</Link> marks.
          Report generation then compiles composites, rankings, and O-Level certification on{" "}
          <Link href="/admin/reports?tab=actions" className="font-medium text-brand hover:underline">Reports</Link>.
        </p>
      </Card>
    </PageWrapper>
  );
}
