"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherExamMarkingList } from "@/components/exams/TeacherExamMarkingList";

export default function ClassTeacherExamsPage() {
  return (
    <PageWrapper
      title="Open exams"
      description="Only subjects assigned to you on the class timetable are listed. Class teachers cannot enter marks for other teachers' subjects."
    >
      <TeacherExamMarkingList basePath="/class-teacher/exams" />
    </PageWrapper>
  );
}
