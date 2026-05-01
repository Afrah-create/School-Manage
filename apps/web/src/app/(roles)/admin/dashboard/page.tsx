"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DashboardErrorState,
  DashboardHeader,
  DashboardPanel,
  DashboardSkeleton,
  DashboardTwoColumn,
  KpiGrid,
} from "@/components/layout/shells/DashboardScaffold";
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

  const metrics = kpis
    ? [
        { label: "Total students", value: kpis.activeStudents, delta: "+3.2%", deltaTone: "positive" as const },
        { label: "Active teachers", value: String(teachers), delta: "Stable", deltaTone: "neutral" as const },
        {
          label: "Collection rate",
          value: `${collectionRate}%`,
          delta: collectionRate >= 70 ? "On target" : "Below target",
          deltaTone: collectionRate >= 70 ? ("positive" as const) : ("negative" as const),
          helper: `Paid ${kpis.totalFeesPaid} / Due ${kpis.totalFeesDue} UGX`,
        },
        { label: "Outstanding fees", value: String(Math.max(0, Number(kpis.totalFeesDue) - Number(kpis.totalFeesPaid))), delta: "Monitor", deltaTone: "neutral" as const },
      ]
    : [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Admin Dashboard"
        description="School overview, operational status, and quick actions."
        actions={
          <>
            <Link href="/admin/students/enrol">
              <Button>Enrol student</Button>
            </Link>
            <Link href="/admin/users/create">
              <Button variant="secondary">Create user</Button>
            </Link>
          </>
        }
      />

      {loading ? <DashboardSkeleton /> : null}
      {err ? <DashboardErrorState message={err} onRetry={() => window.location.reload()} /> : null}

      {!loading && !err && kpis ? (
        <>
          <KpiGrid metrics={metrics} />
          <DashboardTwoColumn
            primary={
              <DashboardPanel title="Recent enrolments" subtitle="Latest admitted students">
                <div className="mb-3 flex items-center justify-end gap-2">
                  <button type="button" className="transition-ui inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50">
                    <Filter className="h-4 w-4 stroke-[1.5]" />
                    Filter
                  </button>
                  <button type="button" className="transition-ui inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50">
                    <FileDown className="h-4 w-4 stroke-[1.5]" />
                    Export
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Student #</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length ? (
                      recent.map((s) => (
                        <tr key={s.id} className="transition-ui border-t border-border/50 hover:bg-muted/40 dark:hover:bg-muted/30">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{s.studentNumber}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{s.fullName}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                          No records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </DashboardPanel>
            }
            secondary={
              <DashboardPanel title="Quick links">
                <div className="space-y-2 text-sm">
                  <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/academic/years">
                    Manage academic years
                  </Link>
                  <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/reports">
                    Open reports center
                  </Link>
                  <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/fees/overview">
                    View fees overview
                  </Link>
                </div>
              </DashboardPanel>
            }
          />
        </>
      ) : null}
    </div>
  );
}
