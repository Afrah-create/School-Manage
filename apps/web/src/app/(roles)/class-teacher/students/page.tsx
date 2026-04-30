"use client";

import { useEffect, useState } from "react";
import type { Student } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { StudentTable } from "@/components/students/StudentTable";
import { apiGet } from "@/lib/api";

export default function ClassTeacherStudentsPage() {
  const [rows, setRows] = useState<Student[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiGet<Student[]>("/students");
        setRows(data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load students");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageWrapper title="My class" description="Students you teach (API-filtered)">
      {err ? <p className="mb-4 text-red-600">{err}</p> : null}
      <StudentTable students={rows} loading={loading} profileBasePath="/class-teacher/students" />
    </PageWrapper>
  );
}
