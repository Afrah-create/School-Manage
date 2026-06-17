"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";

export default function AdminAssessmentHubPage() {
  return (
    <PageWrapper
      title="Assessment"
      description="Use the Assessment menu in the sidebar for CBC, A-Level, and formal exam workflows."
    >
      <p className="-mt-2 mb-6 text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Term assessment</strong> (CBC competencies or A-Level
        scores) feeds report cards across the term. <strong className="font-medium text-foreground">Formal exams</strong>{" "}
        are one-off papers with their own lifecycle and teacher marking queue.
      </p>

      <Card title="Grading scales">
        <p className="text-sm text-muted-foreground">
          O-Level and A-Level numeric grade bands (A–F, points, descriptors) are configured under{" "}
          <Link href="/admin/academic/grading-scales" className="font-medium text-brand hover:underline">
            Academic → Grading scales
          </Link>
          . Exam marking and A-Level assessment both read from the scale that matches the class level.
        </p>
      </Card>
    </PageWrapper>
  );
}
