"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherAssessmentAssignmentsList } from "@/components/assessment/TeacherAssessmentAssignmentsList";

export default function SubjectTeacherCbcListPage() {
  return (
    <PageWrapper
      title="CBC assessment"
      description="Term competency ratings (A–D) for O-Level subjects with CBC strands configured. Formal exams are under Exams."
    >
      <TeacherAssessmentAssignmentsList
        track="cbc"
        emptyTitle="No CBC assignments"
        emptyDescription="When you are assigned to teach a subject on a class timetable, it will appear here for term assessment entry."
      />
    </PageWrapper>
  );
}
