"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  GraduationCap,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DashboardQuickAccess } from "@/components/dashboard/DashboardQuickAccess";
import { DashboardTableSection } from "@/components/dashboard/DashboardTableSection";
import { Button } from "@/components/ui/Button";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { DashboardHeader, KpiGrid } from "@/components/layout/shells/DashboardScaffold";
import type { DashboardMetric } from "@/components/layout/shells/types";
import { formatUgx, parseMoneyAmount } from "@/lib/formatMoney";

type Kpis = {
  activeStudents: string;
  totalFeesDue: string;
  totalFeesPaid: string;
};

type StudentRow = {
  id: string;
  studentNumber: string;
  fullName: string;
  enrolledAt?: string;
};

const QUICK_GROUPS = [
  {
    title: "People",
    links: [
      { href: "/admin/students", label: "Students", description: "Enrol and manage learners", icon: Users },
      { href: "/admin/users", label: "Staff users", description: "Accounts and roles", icon: GraduationCap },
      { href: "/admin/students/enrol", label: "Enrol student", description: "Admit a new learner", icon: Users },
    ],
  },
  {
    title: "Academic setup",
    links: [
      { href: "/admin/academic", label: "Academic structure", description: "Years, classes, subjects", icon: BookOpen },
      {
        href: "/admin/academic/teacher-assignments",
        label: "Teacher assignments",
        description: "Who teaches what",
        icon: GraduationCap,
      },
      { href: "/admin/assessment", label: "Assessment overview", description: "CBC and A-Level progress", icon: ClipboardCheck },
      { href: "/admin/reports", label: "Report cards", description: "Generate and monitor reports", icon: FileBarChart2 },
    ],
  },
  {
    title: "Fees & system",
    links: [
      { href: "/admin/fees/publish", label: "Publish fees", description: "Release schedules to bursar", icon: CreditCard },
      { href: "/admin/fees/structure", label: "Fee structure", description: "Categories per class", icon: CreditCard },
      { href: "/admin/settings", label: "School settings", description: "Branding and preferences", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit logs", description: "Security and changes", icon: Shield },
    ],
  },
];

function formatEnrolled(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminDashboardContent({
  kpis,
  teacherCount,
  students,
}: {
  kpis: Kpis;
  teacherCount: number;
  students: StudentRow[];
}) {
  const [recentPage, setRecentPage] = useState(1);
  const pageSize = 8;

  const feesDue = parseMoneyAmount(kpis.totalFeesDue);
  const feesPaid = parseMoneyAmount(kpis.totalFeesPaid);
  const feesGap = Math.max(0, feesDue - feesPaid);
  const collectionPct = feesDue > 0 ? Math.min(100, Math.round((feesPaid / feesDue) * 100)) : 0;

  const recent = useMemo(
    () =>
      [...students].sort((a, b) => {
        const ta = a.enrolledAt ? new Date(a.enrolledAt).getTime() : 0;
        const tb = b.enrolledAt ? new Date(b.enrolledAt).getTime() : 0;
        return tb - ta;
      }),
    [students],
  );

  const totalPages = Math.max(1, Math.ceil(recent.length / pageSize));
  const start = (recentPage - 1) * pageSize;
  const pageRows = recent.slice(start, start + pageSize);

  const metrics: DashboardMetric[] = [
    { label: "Active students", value: kpis.activeStudents, delta: "Enrolled", deltaTone: "positive" },
    { label: "Active teachers", value: String(teacherCount), delta: "Teaching staff", deltaTone: "neutral" },
    {
      label: "Collection rate",
      value: feesDue > 0 ? `${collectionPct}%` : "—",
      helper: "School-wide fee collection",
      delta: collectionPct >= 70 ? "On target" : "Below target",
      deltaTone: collectionPct >= 70 ? "positive" : "negative",
    },
    {
      label: "Outstanding",
      value: formatUgx(feesGap, { compact: true }),
      helper: "UGX still to collect",
      delta: "Monitor bursar",
      deltaTone: "neutral",
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Admin dashboard"
        description="School configuration, people, fees, and academic oversight."
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

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">School population</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{kpis.activeStudents}</p>
          <p className="mt-1 text-sm text-muted-foreground">Active students · {teacherCount} teachers on staff</p>
          <Link href="/admin/students" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            Manage students →
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-gradient-to-br from-brand/8 to-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Finance snapshot</p>
          <p className="mt-2 text-sm text-muted-foreground">Outstanding on all invoices</p>
          <div className="mt-1">
            <MoneyAmount amount={feesGap} compact size="hero" tone="warning" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/80 pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <MoneyAmount amount={feesPaid} compact size="sm" tone="positive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billed</p>
              <MoneyAmount amount={feesDue} compact size="sm" />
            </div>
          </div>
          <Link href="/admin/fees/publish" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
            Fees management →
          </Link>
        </div>
      </section>

      <KpiGrid metrics={metrics} />

      <DashboardQuickAccess groups={QUICK_GROUPS} />

      <DashboardTableSection
        title="Recent enrolments"
        subtitle="Latest students admitted to the school."
        headerLink="/admin/students"
        headerLinkLabel="All students"
        footer={
          recent.length > pageSize ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Page {recentPage} of {totalPages} · {recent.length} total
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="h-8 px-3"
                  disabled={recentPage <= 1}
                  onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  className="h-8 px-3"
                  disabled={recentPage >= totalPages}
                  onClick={() => setRecentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Student #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Enrolled
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-3.5 font-medium tabular-nums">{s.studentNumber}</td>
                  <td className="px-3 py-3.5 text-foreground">{s.fullName}</td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-muted-foreground">
                    {formatEnrolled(s.enrolledAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-0">
                  <EmptyState
                    title="No enrolments yet"
                    description="New students will appear here after admission."
                    icon={Users}
                    action={{ label: "Enrol student", href: "/admin/students/enrol" }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DashboardTableSection>
    </div>
  );
}
