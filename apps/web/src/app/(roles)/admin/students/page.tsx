"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { EnrolmentModal } from "@/components/students/EnrolmentModal";
import { StudentEditModal } from "@/components/students/StudentEditModal";
import { StudentImportPanel } from "@/components/students/StudentImportPanel";
import { StudentsDirectory } from "@/components/students/StudentsDirectory";
import { Button } from "@/components/ui/Button";

export default function AdminStudentsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [enrolOpen, setEnrolOpen] = useState(false);

  return (
    <PageWrapper
      title="Students"
      description="Browse learners by class with search and pagination — built for large enrolments"
    >
      <div className="mb-6 flex flex-wrap justify-end gap-2">
        <Link href="/admin/students/enrol">
          <Button variant="secondary">Full-page enrolment</Button>
        </Link>
        <Button type="button" onClick={() => setEnrolOpen(true)}>
          Enrol new student
        </Button>
      </div>

      <div className="mb-6">
        <StudentImportPanel onImported={() => void qc.invalidateQueries({ queryKey: ["students"] })} />
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

      <EnrolmentModal
        open={enrolOpen}
        onClose={() => setEnrolOpen(false)}
        onCreated={(id) => {
          void qc.invalidateQueries({ queryKey: ["students"] });
          router.push(`/admin/students/${id}?created=1`);
        }}
      />
    </PageWrapper>
  );
}
