"use client";

import { useEffect, useMemo, useState } from "react";
import type { Student } from "@uganda-cbc-sms/shared";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { StudentTable } from "@/components/students/StudentTable";
import { apiGet } from "@/lib/api";

export type TeacherClassOption = {
  classId: string;
  className: string;
  classStream: string;
  level: string;
  academicYearId: string;
  academicYearName: string;
  isHomeroom: boolean;
  studentCount: number;
};

type Props = {
  title: string;
  description: string;
  profileBasePath: string;
};

export function TeacherStudentsByClass({ title, description, profileBasePath }: Props) {
  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const selectedClass = useMemo(() => classes.find((c) => c.classId === classId) ?? null, [classes, classId]);

  const classOptions = useMemo(
    () =>
      classes.map((c) => ({
        value: c.classId,
        label: `${c.className} ${c.classStream}${c.isHomeroom ? " (homeroom)" : ""} · ${c.studentCount} learners`,
      })),
    [classes],
  );

  useEffect(() => {
    void (async () => {
      setErr(null);
      try {
        const rows = await apiGet<TeacherClassOption[]>("/academic/my-classes");
        setClasses(rows);
        if (rows[0] && !classId) setClassId(rows[0].classId);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load your classes");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    setStudentsLoading(true);
    setErr(null);
    void (async () => {
      try {
        const rows = await apiGet<Student[]>(`/students?classId=${encodeURIComponent(classId)}`);
        setStudents(rows);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load students");
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    })();
  }, [classId]);

  return (
    <PageWrapper title={title} description={description}>
      {err ? <Alert tone="error">{err}</Alert> : null}
      <Card title="Your classes">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading classes…</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No classes are assigned to you yet. Ask the administrator to add you under Academic → Class teachers or
            assign subjects under Teacher workload.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Class"
              options={classOptions}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            />
            {selectedClass ? (
              <div className="flex flex-col justify-end text-sm text-muted-foreground">
                <p>
                  {selectedClass.academicYearName} · {selectedClass.level === "O_LEVEL" ? "O-Level" : "A-Level"}
                </p>
                <p>{selectedClass.studentCount} active learner(s)</p>
              </div>
            ) : null}
          </div>
        )}
      </Card>
      <Card title={selectedClass ? `Learners — ${selectedClass.className} ${selectedClass.classStream}` : "Learners"}>
        <StudentTable students={students} loading={studentsLoading} profileBasePath={profileBasePath} />
      </Card>
    </PageWrapper>
  );
}
