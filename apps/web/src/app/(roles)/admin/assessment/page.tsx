"use client";

import Link from "next/link";
import { AssessmentGuidePromo } from "@/components/assessment/guide/AssessmentGuidePage";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";

export default function AdminAssessmentHubPage() {
  return (
    <PageWrapper
      title="Assessment"
      description="Term exams, project work, and configurable A–E grading for O-Level report cards."
    >
      <AssessmentGuidePromo viewerRole="admin" className="mb-6" />
      <p className="-mt-2 mb-6 text-sm text-muted-foreground">
        Create <strong className="font-medium text-foreground">multiple exams per term</strong>, teachers enter marks,
        optional <strong className="font-medium text-foreground">project work</strong> blends in when enabled, and
        report cards show exam columns (C1…Cn), average, and final A–E grade.
      </p>

      <Card title="Setup workflow">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <Link href="/admin/exams" className="font-medium text-brand hover:underline">
              Create and open exams →
            </Link>
          </li>
          <li>
            <Link href="/admin/assessment/rules" className="font-medium text-brand hover:underline">
              Term grade policy (weights, project work toggle) →
            </Link>
          </li>
          <li>
            <Link href="/admin/assessment/project-work" className="font-medium text-brand hover:underline">
              Project work tracker →
            </Link>
          </li>
          <li>
            <Link href="/admin/academic/class-subjects" className="font-medium text-brand hover:underline">
              Class subjects (report + project work flags) →
            </Link>
          </li>
          <li>
            <Link href="/admin/academic/grading-scales" className="font-medium text-brand hover:underline">
              A–E grading scales →
            </Link>
          </li>
          <li>
            <Link href="/admin/reports?tab=actions" className="font-medium text-brand hover:underline">
              Generate report cards →
            </Link>
          </li>
        </ul>
      </Card>
    </PageWrapper>
  );
}
