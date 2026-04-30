"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type Kpis = {
  activeStudents: string;
  totalFeesDue: string;
  totalFeesPaid: string;
};

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
};

type StudentRow = {
  id: string;
  studentNumber: string;
  fullName: string;
  enrolledAt?: string;
};

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [teachers, setTeachers] = useState(0);
  const [recent, setRecent] = useState<StudentRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [k, users, students] = await Promise.all([
          apiGet<Kpis>("/analytics/dashboard"),
          apiGet<UserRow[]>("/users"),
          apiGet<StudentRow[]>("/students"),
        ]);
        setKpis(k);
        const teacherRoles = new Set([
          "class_teacher",
          "subject_teacher",
          "headteacher",
        ]);
        setTeachers(
          users.filter((u) => u.isActive !== false && teacherRoles.has(u.role)).length,
        );
        const sorted = [...students].sort((a, b) => {
          const ta = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
          const tb = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
          return tb - ta;
        });
        setRecent(sorted.slice(0, 5));
        const due = Number(k.totalFeesDue ?? 0);
        const paid = Number(k.totalFeesPaid ?? 0);
        void due;
        void paid;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const collectionRate =
    kpis && Number(kpis.totalFeesDue) > 0
      ? Math.round((Number(kpis.totalFeesPaid) / Number(kpis.totalFeesDue)) * 100)
      : 0;

  return (
    <PageWrapper title="Dashboard" description="School overview">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-lg bg-slate-200" />
          <div className="h-40 rounded-lg bg-slate-200" />
        </div>
      ) : null}
      {err ? (
        <Card title="Error">
          <p className="text-red-600">{err}</p>
        </Card>
      ) : null}
      {!loading && !err && kpis ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card title="Total students">
              <p className="text-3xl font-bold text-brand">{kpis.activeStudents}</p>
            </Card>
            <Card title="Active teachers">
              <p className="text-3xl font-bold text-brand">{teachers}</p>
            </Card>
            <Card title="Term fee collection rate">
              <p className="text-3xl font-bold text-brand">{collectionRate}%</p>
              <p className="text-xs text-slate-500">
                Paid {kpis.totalFeesPaid} / Due {kpis.totalFeesDue} UGX
              </p>
            </Card>
          </div>

          <Card title="Recent enrolments">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Student #</th>
                  <th className="py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs">{s.studentNumber}</td>
                    <td className="py-2">{s.fullName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/students/enrol">
              <Button>Enrol student</Button>
            </Link>
            <Link href="/admin/users/create">
              <Button variant="secondary">Create user</Button>
            </Link>
            <Link href="/admin/academic/years">
              <Button variant="secondary">Manage academic year</Button>
            </Link>
          </div>
        </div>
      ) : null}
    </PageWrapper>
  );
}
