"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { FileDown, GraduationCap } from "lucide-react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import {
  DashboardHeader,
  DashboardPanel,
  DashboardSkeleton,
  DashboardTwoColumn,
  KpiGrid,
} from "@/components/layout/shells/DashboardScaffold";
import { apiGet } from "@/lib/api";
import { combineQueryStatus } from "@/lib/queryStatus";

type TermRow = { id: string; academicYearId: string; isActive?: boolean; termNumber?: number };
type CbcRow = { submitted?: boolean; id: string };
type Stu = { id: string; fullName: string; studentNumber: string };

export default function SubjectTeacherDashboardPage() {
  const [studentsQ, termsQ, cbcQ] = useQueries({
    queries: [
      { queryKey: ["students"], queryFn: () => apiGet<Stu[]>("/students") },
      { queryKey: ["terms"], queryFn: () => apiGet<TermRow[]>("/academic/terms") },
      {
        queryKey: ["cbc-dashboard"],
        queryFn: async () => {
          const terms = await apiGet<TermRow[]>("/academic/terms");
          const active = terms.find((t) => t.isActive) ?? terms[0] ?? null;
          if (!active?.id || !active.academicYearId) {
            return { termId: null as string | null, yearId: null as string | null, rows: [] as CbcRow[] };
          }
          const rows = await apiGet<CbcRow[]>(
            `/assessments/cbc?termId=${encodeURIComponent(active.id)}&yearId=${encodeURIComponent(active.academicYearId)}`,
          );
          return { termId: active.id, yearId: active.academicYearId, rows };
        },
      },
    ],
  });

  const queries = [studentsQ, termsQ, cbcQ];
  const status = combineQueryStatus(queries);
  const isFetching = queries.some((q) => q.isFetching && !q.isPending);
  const errorMessage =
    (studentsQ.error ?? termsQ.error ?? cbcQ.error) instanceof Error
      ? (studentsQ.error ?? termsQ.error ?? cbcQ.error)!.message
      : "Failed to load";

  const students = studentsQ.data ?? [];
  const cbcRows = cbcQ.data?.rows ?? [];
  const termId = cbcQ.data?.termId ?? null;
  const submitted = cbcRows.filter((r) => r.submitted).length;
  const pending = cbcRows.length - submitted;

  const metrics = [
    { label: "Learners in scope", value: String(students.length), delta: "Roster", deltaTone: "neutral" as const },
    { label: "Submitted rows", value: String(submitted), delta: "Marked", deltaTone: "neutral" as const },
    {
      label: "Pending rows",
      value: String(pending),
      delta: pending > 0 ? "Needs update" : "Completed",
      deltaTone: pending > 0 ? ("negative" as const) : ("positive" as const),
    },
    {
      label: "Active term",
      value: termId ? "Configured" : "Not set",
      delta: termId ? "Ready" : "Missing",
      deltaTone: termId ? ("positive" as const) : ("negative" as const),
    },
  ];

  const learnerPreview = useMemo(() => students.slice(0, 5), [students]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Subject Teacher Dashboard"
        description="Assessment tracking and learner performance workflow."
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
            <DashboardPanel title="Learner snapshot">
              <div className="mb-3 flex items-center justify-end">
                <button
                  type="button"
                  className="transition-ui inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50"
                >
                  <FileDown className="h-4 w-4 stroke-[1.5]" />
                  Export
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Learner
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Student #
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {learnerPreview.length ? (
                      learnerPreview.map((s) => (
                        <tr
                          key={s.id}
                          className="transition-ui border-t border-border/50 hover:bg-muted/40 dark:hover:bg-muted/30"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{s.fullName}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {s.studentNumber}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="p-0">
                          <EmptyState
                            title="No learners in scope"
                            description="Students assigned to your subjects will appear here."
                            icon={GraduationCap}
                            action={{ label: "Enter CBC marks", href: "/subject-teacher/assessment/cbc" }}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardPanel>
          }
          secondary={
            <DashboardPanel title="Assessment shortcuts">
              <div className="space-y-2 text-sm">
                <Link
                  className="block text-blue-600 hover:underline dark:text-blue-400"
                  href="/subject-teacher/exams"
                >
                  Open exams (formal marking)
                </Link>
                <Link
                  className="block text-blue-600 hover:underline dark:text-blue-400"
                  href="/subject-teacher/assessment/cbc"
                >
                  CBC assessment (term competencies)
                </Link>
                <Link
                  className="block text-blue-600 hover:underline dark:text-blue-400"
                  href="/subject-teacher/assessment/alevel"
                >
                  A-Level assessment (term scores)
                </Link>
              </div>
            </DashboardPanel>
          }
        />
      </AsyncContent>
    </div>
  );
}
