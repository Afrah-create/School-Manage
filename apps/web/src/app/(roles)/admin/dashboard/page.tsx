"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";
import { DashboardSkeleton } from "@/components/layout/shells/DashboardScaffold";
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

  const teacherCount = useMemo(() => {
    const users = usersQ.data ?? [];
    const teacherRoles = new Set(["class_teacher", "subject_teacher", "headteacher"]);
    return users.filter((u) => u.isActive !== false && teacherRoles.has(u.role)).length;
  }, [usersQ.data]);

  return (
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
      {kpisQ.data ? (
        <AdminDashboardContent
          kpis={kpisQ.data}
          teacherCount={teacherCount}
          students={studentsQ.data ?? []}
        />
      ) : null}
    </AsyncContent>
  );
}
