"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { CbcTermSummaryPanel } from "@/components/cbc/CbcTermSummaryPanel";
import { HeadteacherAssessmentStatusPanel } from "@/components/headteacher/HeadteacherAssessmentStatusPanel";
import type { HeadteacherPeriodValue } from "@/components/headteacher/HeadteacherPeriodFilters";
import { useCbcActions } from "@/hooks/useCBCAssessment";

export default function HeadteacherCbcAssessmentPage() {
  const { unlock } = useCbcActions();

  const handleUnlock = async (subjectId: string, filters: HeadteacherPeriodValue) => {
    await unlock.mutateAsync({
      subjectId,
      classId: filters.classId,
      termId: filters.termId,
      yearId: filters.yearId,
    });
  };

  return (
    <PageWrapper
      title="CBC assessments"
      description="Review NCDC term competency summaries, apply overrides, and manage legacy sheet unlock"
    >
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        <Link href="/headteacher/assessment" className="font-medium text-brand hover:underline">
          ← Assessment hub
        </Link>
      </p>

      <CbcTermSummaryPanel variant="headteacher" />

      <div className="mt-10">
        <HeadteacherAssessmentStatusPanel
          track="cbc"
          title="Legacy CBC sheet progress"
          description="Subject teachers lock activities per assessment event. Use unlock below only when correcting legacy strand sheets that were submitted under the old flow."
          statusPath="/assessments/cbc/status"
          canUnlock
          onUnlock={handleUnlock}
        />
      </div>
    </PageWrapper>
  );
}
