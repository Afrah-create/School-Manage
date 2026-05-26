"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StudentEditModal } from "@/components/students/StudentEditModal";
import { StudentsDirectory } from "@/components/students/StudentsDirectory";
import { Button } from "@/components/ui/Button";

export default function AdminStudentsPage() {
  const qc = useQueryClient();
  const [editStudentId, setEditStudentId] = useState<string | null>(null);

  return (
    <PageWrapper
      title="Students"
      description="Browse learners by class with search and pagination — built for large enrolments"
    >
      <div className="mb-6 flex justify-end">
        <Link href="/admin/students/enrol">
          <Button>Enrol new student</Button>
        </Link>
      </div>

      <StudentsDirectory
        profileBasePath="/admin/students"
        showEnrollmentActions
        onEditStudent={setEditStudentId}
        enrolHref="/admin/students/enrol"
      />

      <StudentEditModal
        open={Boolean(editStudentId)}
        studentId={editStudentId}
        onClose={() => setEditStudentId(null)}
        onSaved={() => {
          setEditStudentId(null);
          void qc.invalidateQueries({ queryKey: ["students"] });
        }}
      />
    </PageWrapper>
  );
}
