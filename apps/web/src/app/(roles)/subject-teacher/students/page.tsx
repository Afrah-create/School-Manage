"use client";

import { TeacherStudentsByClass } from "@/components/teaching/TeacherStudentsByClass";

export default function SubjectTeacherStudentsPage() {
  return (
    <TeacherStudentsByClass
      title="My classes"
      description="Learners in classes where you teach at least one subject"
      profileBasePath="/subject-teacher/students"
    />
  );
}
