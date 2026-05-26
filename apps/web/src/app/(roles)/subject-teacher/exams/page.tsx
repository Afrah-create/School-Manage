"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherExamsPageContent } from "@/components/exams/TeacherExamsPageContent";

export default function SubjectTeacherExamsPage() {
  return (
    <PageWrapper
      title="Open exams"
      description="Formal exam marking for your assigned class–subject papers."
    >
      <TeacherExamsPageContent roleBase="/subject-teacher" />
    </PageWrapper>
  );
}
