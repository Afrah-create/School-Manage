"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherExamsPageContent } from "@/components/exams/TeacherExamsPageContent";

export default function ClassTeacherExamsPage() {
  return (
    <PageWrapper
      title="Open exams"
      description="Formal exam marking for class–subject papers you teach on the timetable."
    >
      <TeacherExamsPageContent roleBase="/class-teacher" />
    </PageWrapper>
  );
}
