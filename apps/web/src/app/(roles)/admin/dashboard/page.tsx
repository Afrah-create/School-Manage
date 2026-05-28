"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { FileDown, Filter } from "lucide-react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import {
  DashboardHeader,
  DashboardPanel,
  DashboardSkeleton,
  DashboardTwoColumn,
  KpiGrid,
} from "@/components/layout/shells/DashboardScaffold";
import { apiGet } from "@/lib/api";
import { combineQueryStatus } from "@/lib/queryStatus";

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
type UsersListResponse = UserRow[] | { items: UserRow[] };

type StudentRow = {
  id: string;
  studentNumber: string;
  fullName: string;
  enrolledAt?: string;
};

export default function AdminDashboardPage() {
  const [recentPage, setRecentPage] = useState(1);
  const recentPageSize = 5;

  const [kpisQ, usersQ, studentsQ] = useQueries({
    queries: [
      { queryKey: ["dashboard-kpis"], queryFn: () => apiGet<Kpis>("/analytics/dashboard") },
      {
        queryKey: ["users"],
        queryFn: async () => {
          const res = await apiGet<UsersListResponse>("/users");
          return Array.isArray(res) ? res : (res.items ?? []);
        },
      },
      { queryKey: ["students"], queryFn: () => apiGet<StudentRow[]>("/students") },
    ],
  });

  const queries = [kpisQ, usersQ, studentsQ];
  const status = combineQueryStatus(queries);
  const isFetching = queries.some((q) => q.isFetching && !q.isPending);
  const errorMessage =
    (kpisQ.error ?? usersQ.error ?? studentsQ.error) instanceof Error
      ? (kpisQ.error ?? usersQ.error ?? studentsQ.error)!.message
      : "Failed to load dashboard";

  const kpis = kpisQ.data;
  const teachers = useMemo(() => {
    const users = usersQ.data ?? [];
    const teacherRoles = new Set(["class_teacher", "subject_teacher", "headteacher"]);
    return users.filter((u) => u.isActive !== false && teacherRoles.has(u.role)).length;
  }, [usersQ.data]);

  const recent = useMemo(() => {
    const students = studentsQ.data ?? [];
    return [...students].sort((a, b) => {
      const ta = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
      const tb = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
      return tb - ta;
    });
  }, [studentsQ.data]);

  const collectionRate =
    kpis && Number(kpis.totalFeesDue) > 0
      ? Math.round((Number(kpis.totalFeesPaid) / Number(kpis.totalFeesDue)) * 100)
      : 0;
  const recentTotalPages = Math.max(1, Math.ceil(recent.length / recentPageSize));
  const recentStart = (recentPage - 1) * recentPageSize;
  const recentRows = recent.slice(recentStart, recentStart + recentPageSize);

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
        {
          label: "Outstanding fees",
          value: String(Math.max(0, Number(kpis.totalFeesDue) - Number(kpis.totalFeesPaid))),
          delta: "Monitor",
          deltaTone: "neutral" as const,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Admin Dashboard"
        description="School overview plus configuration and oversight actions for the teacher-led assessment flow."
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

      <AsyncContent
        status={status}
        isFetching={isFetching}
        loading={<DashboardSkeleton />}
        error={
          <ErrorState
            message={errorMessage}
            onRetry={() => void Promise.all(queries.map((q) => q.refetch()))}
          />
        }
      >
        <KpiGrid metrics={metrics} />
        <DashboardTwoColumn
          primary={
            <DashboardPanel title="Recent enrolments" subtitle="Latest admitted students">
              <div className="mb-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="transition-ui inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50"
                >
                  <Filter className="h-4 w-4 stroke-[1.5]" />
                  Filter
                </button>
                <button
                  type="button"
                  className="transition-ui inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50"
                >
                  <FileDown className="h-4 w-4 stroke-[1.5]" />
                  Export
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Student #
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Name
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Enrolled
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.length ? (
                      recentRows.map((s) => (
                        <tr
                          key={s.id}
                          className="transition-ui border-t border-border/50 odd:bg-background even:bg-muted/20 hover:bg-muted/40 dark:hover:bg-muted/30"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{s.studentNumber}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{s.fullName}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-0">
                          <EmptyState
                            title="No recent enrolments"
                            description="Newly enrolled students will appear here."
                            icon={Users}
                            action={{ label: "Enrol student", href: "/admin/students/enrol" }}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {recent.length > recentPageSize ? (
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Page {recentPage} of {recentTotalPages} • Showing {recentRows.length} of {recent.length}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="h-8 px-3"
                      disabled={recentPage <= 1}
                      onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-8 px-3"
                      disabled={recentPage >= recentTotalPages}
                      onClick={() => setRecentPage((p) => Math.min(recentTotalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </DashboardPanel>
          }
          secondary={
            <DashboardPanel title="Quick links">
              <div className="space-y-2 text-sm">
                <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/academic/years">
                  Manage academic years
                </Link>
                <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/academic/grading-scales">
                  Define grading scales
                </Link>
                <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/academic/class-subjects">
                  Review class-subject assignments
                </Link>
                <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/academic/teacher-assignments">
                  Review teacher assignments
                </Link>
                <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/reports">
                  Open reports center
                </Link>
                <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/fees/structure">
                  Configure fee structure
                </Link>
                <Link className="block text-blue-600 hover:underline dark:text-blue-400" href="/admin/assessment">
                  Assessment overview - monitor CBC and A-Level progress
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Admin configures grading and academic structure; subject teachers enter marks; class teachers and
                headteacher complete remarks and approvals.
              </p>
            </DashboardPanel>
          }
        />
      </AsyncContent>
    </div>
  );
}
