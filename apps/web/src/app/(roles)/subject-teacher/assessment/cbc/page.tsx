"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherAssessmentAssignmentsList } from "@/components/assessment/TeacherAssessmentAssignmentsList";

export default function SubjectTeacherCbcListPage() {
  return (
    <PageWrapper
      title="CBC assessment"
      description="Each row is a class–subject you are assigned to teach. Open a row to enter competency ratings for the term."
    >
      <TeacherAssessmentAssignmentsList
        track="cbc"
        emptyTitle="No CBC assignments"
        emptyDescription="When you are assigned to teach a subject on a class timetable, it will appear here for term assessment entry."
      />
    </PageWrapper>
  );
}
