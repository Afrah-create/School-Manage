"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";
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

type Kpis = {
  activeStudents: string;
  totalFeesDue: string;
  totalFeesPaid: string;
  averageCbcNumeric: string;
  averageAlevelScore: string;
};
type TermRow = { id: string; termNumber?: number; startDate?: string; endDate?: string; isActive?: boolean };

const QUICK_LINKS = [
  { href: "/headteacher/attendance", label: "School attendance", icon: Calendar },
  { href: "/headteacher/exams", label: "Exams & marking", icon: FileText },
  { href: "/headteacher/assessment", label: "Assessment oversight", icon: ClipboardCheck },
  { href: "/headteacher/reports", label: "Report cards", icon: FileBarChart2 },
  { href: "/headteacher/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/headteacher/fees", label: "School finance", icon: CreditCard },
  { href: "/headteacher/students", label: "Students", icon: Users },
  { href: "/headteacher/users", label: "Staff accounts", icon: GraduationCap },
  { href: "/headteacher/academic", label: "Academic structure", icon: BookOpen },
  { href: "/headteacher/academic/timetable", label: "School timetable", icon: Calendar },
];

function formatScore(raw: string, decimals = 1): string {
  const n = Number(raw);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

export default function HeadteacherDashboardPage() {
  const [kpisQ, termsQ] = useQueries({
    queries: [
      { queryKey: ["dashboard-kpis"], queryFn: () => apiGet<Kpis>("/analytics/dashboard") },
      { queryKey: ["terms"], queryFn: () => apiGet<TermRow[]>("/academic/terms") },
    ],
  });

  const queries = [kpisQ, termsQ];
  const status = combineQueryStatus(queries);
  const isFetching = queries.some((q) => q.isFetching && !q.isPending);
  const errorMessage =
    (kpisQ.error ?? termsQ.error) instanceof Error
      ? (kpisQ.error ?? termsQ.error)!.message
      : "Failed to load dashboard";

  const kpis = kpisQ.data;
  const terms = termsQ.data ?? [];

  const current = terms.find((x) => x.isActive);
  const daysRemaining = (() => {
    if (!current?.endDate) return null;
    const end = new Date(String(current.endDate)).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
  })();

  const cbcAvg = kpis ? formatScore(kpis.averageCbcNumeric) : "—";
  const alAvg = kpis ? formatScore(kpis.averageAlevelScore) : "—";

  const metrics = kpis
    ? [
        {
          label: "Active students",
          value: kpis.activeStudents,
          delta: "Enrolled",
          deltaTone: "positive" as const,
        },
        {
          label: "Avg CBC rating",
          value: cbcAvg,
          helper: "School-wide (A=4 scale)",
          delta: "O-Level",
          deltaTone: "neutral" as const,
        },
        {
          label: "Avg A-Level score",
          value: alAvg,
          helper: "Across entered marks",
          delta: "A-Level",
          deltaTone: "neutral" as const,
        },
        {
          label: "Current term",
          value: current ? `Term ${current.termNumber ?? "?"}` : "Not set",
          delta: current ? "Active" : "Needs setup",
          deltaTone: current ? ("positive" as const) : ("negative" as const),
          helper: daysRemaining !== null ? `${daysRemaining} days remaining` : "Set active term",
        },
      ]
    : [];

  const termRows = useMemo(() => terms.slice(0, 6), [terms]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Headteacher Dashboard"
        description="Oversight of academic progress, assessments, exams, attendance, and report cards."
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
            <DashboardPanel title="Current terms" subtitle="Academic calendar status">
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Term
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Start
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        End
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {termRows.length ? (
                      termRows.map((term) => (
                        <tr
                          key={term.id}
                          className="transition-ui border-t border-border/50 hover:bg-muted/40 dark:hover:bg-muted/30"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                            Term {term.termNumber ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {term.startDate ? new Date(term.startDate).toLocaleDateString() : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {term.endDate ? new Date(term.endDate).toLocaleDateString() : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                term.isActive
                                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {term.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-0">
                          <EmptyState
                            title="No terms configured"
                            description="Ask admin to set up academic years and terms."
                            icon={Calendar}
                            action={{ label: "View academic hub", href: "/headteacher/academic" }}
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
            <DashboardPanel title="Leadership shortcuts">
              <ul className="space-y-2">
                {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="transition-ui flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-brand hover:bg-accent/50"
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </DashboardPanel>
          }
        />
      </AsyncContent>
    </div>
  );
}
