"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { TeacherExamMarkingList } from "@/components/exams/TeacherExamMarkingList";

export default function SubjectTeacherExamsPage() {
  return (
    <PageWrapper
      title="Open exams"
      description="Each row is one of your assigned subjects on an open exam. You can only enter and submit marks for subjects on your timetable."
    >
      <TeacherExamMarkingList basePath="/subject-teacher/exams" />
    </PageWrapper>
  );
}
