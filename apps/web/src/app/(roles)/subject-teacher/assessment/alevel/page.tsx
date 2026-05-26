"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherAssessmentAssignmentsList } from "@/components/assessment/TeacherAssessmentAssignmentsList";

export default function SubjectTeacherAlevelListPage() {
  return (
    <PageWrapper
      title="A-Level assessment"
      description="Each row is an A-Level class–subject you teach. Open a row to enter UNEB scores (0–100) for the term."
    >
      <TeacherAssessmentAssignmentsList
        track="alevel"
        emptyTitle="No A-Level assignments"
        emptyDescription="When you are assigned to teach a subject on an A-Level class timetable, it will appear here for term score entry."
      />
    </PageWrapper>
  );
}
