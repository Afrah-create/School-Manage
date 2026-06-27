"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherAssessmentAssignmentsList } from "@/components/assessment/TeacherAssessmentAssignmentsList";

export default function SubjectTeacherCbcListPage() {
  return (
    <PageWrapper
      title="Competency assessment"
      description="NCDC 4-level competency ratings via assessment activities. Formal exams are under Exams."
    >
      <TeacherAssessmentAssignmentsList
        track="cbc"
        emptyTitle="No competency assignments"
        emptyDescription="When you are assigned to teach a subject on a class timetable, it will appear here for term assessment entry."
      />
    </PageWrapper>
  );
}
