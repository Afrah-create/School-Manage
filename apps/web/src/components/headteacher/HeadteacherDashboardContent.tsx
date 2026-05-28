"use client";

import Link from "next/link";
import { useMemo } from "react";
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
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MoneyAmount } from "@/components/ui/MoneyAmount";
import { DashboardHeader, KpiGrid } from "@/components/layout/shells/DashboardScaffold";
import type { DashboardMetric } from "@/components/layout/shells/types";
import { parseMoneyAmount } from "@/lib/formatMoney";

type Kpis = {
  activeStudents: string;
  totalFeesDue: string;
  totalFeesPaid: string;
  averageCbcNumeric: string;
  averageAlevelScore: string;
};

type TermRow = {
  id: string;
  termNumber?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

type QuickLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const QUICK_GROUPS: { title: string; links: QuickLink[] }[] = [
  {
    title: "Academic oversight",
    links: [
      {
        href: "/headteacher/assessment",
        label: "Assessments",
        description: "CBC and A-Level entry status",
        icon: ClipboardCheck,
      },
      {
        href: "/headteacher/exams",
        label: "Exams & marking",
        description: "Exam cycles and submissions",
        icon: FileText,
      },
      {
        href: "/headteacher/reports",
        label: "Report cards",
        description: "Generate and approve reports",
        icon: FileBarChart2,
      },
      {
        href: "/headteacher/analytics",
        label: "Analytics",
        description: "Performance and readiness",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "School operations",
    links: [
      {
        href: "/headteacher/attendance",
        label: "Attendance",
        description: "School-wide attendance view",
        icon: Calendar,
      },
      {
        href: "/headteacher/academic/timetable",
        label: "Timetable",
        description: "Published class schedules",
        icon: Calendar,
      },
      {
        href: "/headteacher/academic",
        label: "Academic structure",
        description: "Classes, subjects, years",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "People & finance",
    links: [
      {
        href: "/headteacher/students",
        label: "Students",
        description: "Browse learner records",
        icon: Users,
      },
      {
        href: "/headteacher/users",
        label: "Staff accounts",
        description: "Teachers and school users",
        icon: GraduationCap,
      },
      {
        href: "/headteacher/fees",
        label: "School finance",
        description: "Collections and payments",
        icon: CreditCard,
      },
    ],
  },
];

function formatScore(raw: string, decimals = 1): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

function formatTermDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HeadteacherDashboardContent({
  kpis,
  terms,
  arrearsCount = 0,
}: {
  kpis: Kpis;
  terms: TermRow[];
  arrearsCount?: number;
}) {
  const current = terms.find((t) => t.isActive);
  const daysRemaining = useMemo(() => {
    if (!current?.endDate) return null;
    const end = new Date(String(current.endDate)).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
  }, [current?.endDate]);

  const feesDue = parseMoneyAmount(kpis.totalFeesDue);
  const feesPaid = parseMoneyAmount(kpis.totalFeesPaid);
  const feesGap = Math.max(0, feesDue - feesPaid);
  const collectionPct = feesDue > 0 ? Math.min(100, Math.round((feesPaid / feesDue) * 100)) : 0;

  const metrics: DashboardMetric[] = [
    {
      label: "Active students",
      value: kpis.activeStudents,
      delta: "Enrolled",
      deltaTone: "positive",
    },
    {
      label: "Avg CBC rating",
      value: formatScore(kpis.averageCbcNumeric),
      helper: "School-wide (A=4 scale)",
      delta: "O-Level",
      deltaTone: "neutral",
    },
    {
      label: "Avg A-Level score",
      value: formatScore(kpis.averageAlevelScore),
      helper: "Across entered marks",
      delta: "A-Level",
      deltaTone: "neutral",
    },
    {
      label: "Collection rate",
      value: feesDue > 0 ? `${collectionPct}%` : "—",
      helper: "Fees collected vs billed",
      delta: arrearsCount > 0 ? `${arrearsCount} arrears` : "On track",
      deltaTone: arrearsCount > 0 ? "negative" : "positive",
    },
  ];

  const termRows = terms.slice(0, 8);

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Headteacher dashboard"
        description="School-wide oversight of learning, assessments, attendance, and finances."
        actions={
          <Link href="/headteacher/analytics">
            <Button variant="secondary">Open analytics</Button>
          </Link>
        }
      />

      {/* Context row: term + finance */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Academic calendar
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {current ? `Term ${current.termNumber ?? "—"}` : "No active term"}
            </p>
            {current ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {formatTermDate(current.startDate)} – {formatTermDate(current.endDate)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Ask admin to activate a term for this year.
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {current ? <Badge tone="success">Active term</Badge> : <Badge tone="neutral">Not set</Badge>}
            {daysRemaining !== null ? (
              <span className="text-sm text-muted-foreground">{daysRemaining} days remaining</span>
            ) : null}
            <Link
              href="/headteacher/academic"
              className="ml-auto text-sm font-medium text-brand hover:underline"
            >
              Academic hub →
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-to-br from-emerald-500/8 to-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                School finance
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Outstanding across all invoices</p>
              <div className="mt-1">
                <MoneyAmount amount={feesGap} compact size="hero" tone="warning" />
              </div>
            </div>
            <Link href="/headteacher/fees">
              <Button variant="secondary" className="shrink-0 text-sm">
                Finance overview
              </Button>
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/80 pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <div className="mt-0.5">
                <MoneyAmount amount={feesPaid} compact size="sm" tone="positive" />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billed</p>
              <div className="mt-0.5">
                <MoneyAmount amount={feesDue} compact size="sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <KpiGrid metrics={metrics} />

      {/* Quick access */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Quick access</h2>
            <p className="text-sm text-muted-foreground">Jump to the areas you oversee most often.</p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {QUICK_GROUPS.map((group) => (
            <div
              key={group.title}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.links.map(({ href, label, description, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-ui hover:bg-accent/50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className="block text-sm font-medium text-foreground">{label}</span>
                        <span className="block text-xs text-muted-foreground">{description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Terms table */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Terms overview</h2>
            <p className="text-sm text-muted-foreground">Academic calendar for planning and reporting.</p>
          </div>
          <Link href="/headteacher/academic" className="text-sm font-medium text-brand hover:underline">
            Manage structure
          </Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Term
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Starts
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Ends
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {termRows.length ? (
                termRows.map((term) => (
                  <tr
                    key={term.id}
                    className="border-b border-border/60 transition-ui last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-foreground">
                      Term {term.termNumber ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-muted-foreground">
                      {formatTermDate(term.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-muted-foreground">
                      {formatTermDate(term.endDate)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      {term.isActive ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Inactive</Badge>
                      )}
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
      </section>
    </div>
  );
}
