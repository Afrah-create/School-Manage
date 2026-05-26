"use client";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { StudentsDirectory } from "@/components/students/StudentsDirectory";

export default function HeadteacherStudentsPage() {
  return (
    <PageWrapper
      title="Students"
      description="Browse school enrolment by class with filters and pagination"
    >
      <StudentsDirectory profileBasePath="/headteacher/students" />
    </PageWrapper>
  );
}
