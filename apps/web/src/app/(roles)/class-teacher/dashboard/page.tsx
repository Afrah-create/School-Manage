"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type ClassRow = {
  id: string;
  name: string;
  stream?: string;
  classTeacherId?: string | null;
};

type StudentRow = { id: string; fullName: string; studentNumber: string; classId?: string | null };

type AttRow = { status?: string; student_name?: string; student_number?: string };

export default function ClassTeacherDashboardPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [myClass, setMyClass] = useState<ClassRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [att, setAtt] = useState<AttRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      try {
        const [classes, stu] = await Promise.all([
          apiGet<ClassRow[]>("/academic/classes"),
          apiGet<StudentRow[]>("/students"),
        ]);
        const mine = classes.find((c) => c.classTeacherId === userId) ?? null;
        setMyClass(mine);
        const inClass = mine ? stu.filter((s) => s.classId === mine.id) : [];
        setStudents(inClass);
        if (mine) {
          const rows = await apiGet<AttRow[]>(
            `/attendance?classId=${encodeURIComponent(mine.id)}&date=${encodeURIComponent(today)}`,
          );
          setAtt(rows);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, today]);

  const absentees = att.filter((a) => a.status === "absent");

  return (
    <PageWrapper title="Dashboard" description="Your class at a glance">
      {loading ? <p className="animate-pulse text-slate-600">Loading…</p> : null}
      {err ? (
        <Card title="Error">
          <p className="text-red-600">{err}</p>
        </Card>
      ) : null}
      {!loading && !err ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="My class">
              {myClass ? (
                <>
                  <p className="text-lg font-semibold">
                    {myClass.name} {myClass.stream ? `· ${myClass.stream}` : ""}
                  </p>
                  <p className="text-sm text-slate-600">Class ID: {myClass.id}</p>
                </>
              ) : (
                <p className="text-sm text-slate-600">No class assigned as class teacher yet.</p>
              )}
            </Card>
            <Card title={`Students (${students.length})`}>
              <ul className="max-h-40 list-inside list-disc overflow-auto text-sm">
                {students.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <Link className="text-brand underline" href={`/class-teacher/students/${s.id}`}>
                      {s.fullName}
                    </Link>
                  </li>
                ))}
              </ul>
              {students.length > 8 ? (
                <Link className="text-xs text-brand underline" href="/class-teacher/students">
                  View all
                </Link>
              ) : null}
            </Card>
          </div>

          <Card title={`Attendance today (${today})`}>
            {myClass ? (
              <>
                <p className="text-sm text-slate-600">
                  Register rows: {att.length}. Absent: {absentees.length}.
                </p>
                {absentees.length ? (
                  <ul className="mt-2 text-sm text-red-700">
                    {absentees.map((a, i) => (
                      <li key={i}>
                        {a.student_name} ({a.student_number})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No absentees recorded for this date.</p>
                )}
                <Link className="mt-2 inline-block text-sm text-brand underline" href="/class-teacher/attendance">
                  Open attendance
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-600">Assign a class to use attendance.</p>
            )}
          </Card>

          <Card title="Comments pending on report cards">
            <p className="text-sm text-slate-600">
              Requires backend support:{" "}
              <code className="rounded bg-slate-100 px-1">GET /api/cbc-report-cards?missingComment=true</code> (or
              similar) is not exposed yet. Use the Comments page when workflow is available.
            </p>
          </Card>
        </div>
      ) : null}
    </PageWrapper>
  );
}
