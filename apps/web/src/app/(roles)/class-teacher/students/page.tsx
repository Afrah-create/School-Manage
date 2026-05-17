"use client";

import { TeacherStudentsByClass } from "@/components/teaching/TeacherStudentsByClass";

export default function ClassTeacherStudentsPage() {
  return (
    <TeacherStudentsByClass
      title="My classes"
      description="Learners in classes you are assigned to (homeroom or subject teaching)"
      profileBasePath="/class-teacher/students"
    />
  );
}
