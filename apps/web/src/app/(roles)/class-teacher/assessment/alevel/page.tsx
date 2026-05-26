"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherAssessmentAssignmentsList } from "@/components/assessment/TeacherAssessmentAssignmentsList";

export default function ClassTeacherAlevelAssessmentPage() {
  return (
    <PageWrapper
      title="A-Level assessment"
      description="Enter UNEB scores for subjects you teach, or manage division and comments for your A-Level class."
    >
      <TeacherAssessmentAssignmentsList
        track="alevel"
        showHomeroom
        emptyTitle="No A-Level subjects to mark"
        emptyDescription="When you are assigned as the subject teacher on an A-Level class timetable, that class–subject appears here for score entry."
      />
    </PageWrapper>
  );
}
