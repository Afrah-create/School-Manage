"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { CbcTermSummaryPanel } from "@/components/cbc/CbcTermSummaryPanel";
import { Card } from "@/components/ui/Card";

export default function AdminCbcAssessmentPage() {
  return (
    <PageWrapper
      title="CBC competency oversight"
      description="Read-only view of NCDC term summaries after teachers record assessment activity ratings"
    >
      <Link href="/admin/assessment" className="mb-4 inline-block text-sm font-medium text-brand hover:underline">
        ← Assessment hub
      </Link>

      <Card>
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <BookOpen className="h-5 w-5" aria-hidden />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">What this page shows</p>
            <p className="mt-1">
              Aggregated competency levels per learner, subject, and term — computed from ratings teachers
              enter on assessment activities. You cannot edit data here; use it to verify progress before
              report cards.
            </p>
            <p className="mt-2">
              Step-by-step workflow for every role:{" "}
              <span className="font-medium text-foreground">docs/cbc-workflow-role-guide.md</span> in the
              repository (also linked from the Assessment hub). Related setup:{" "}
              <Link href="/admin/academic/cbc-strands" className="font-medium text-brand hover:underline">
                CBC strands
              </Link>
              ,{" "}
              <Link href="/admin/assessment/rules" className="font-medium text-brand hover:underline">
                Assessment rules
              </Link>
              ,{" "}
              <Link href="/admin/academic/grading-scales" className="font-medium text-brand hover:underline">
                Grading scales
              </Link>
              .
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <CbcTermSummaryPanel variant="admin" />
      </div>
    </PageWrapper>
  );
}
