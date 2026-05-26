"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ClassEnrollmentSummary } from "@uganda-cbc-sms/shared";
import { ChartSkeletonGrid } from "@/components/feedback/ChartSkeleton";
import { ChartPanel } from "@/components/reports/ChartPanel";
import { CHART_COLORS } from "@/components/reports/chartTheme";
import { Alert } from "@/components/ui/Alert";
import { useClassEnrollmentSummary } from "@/hooks/useStudentsBrowse";

const UNASSIGNED_COLOR = "#d97706";

type ChartRow = {
  classId: string;
  label: string;
  fullLabel: string;
  active: number;
  other: number;
  total: number;
  pct: number;
  isUnassigned: boolean;
};

function classLabel(c: ClassEnrollmentSummary): string {
  return c.classStream ? `${c.className} · ${c.classStream}` : c.className;
}

function shortLabel(label: string, max = 18): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

function buildRows(summary: ClassEnrollmentSummary[]): ChartRow[] {
  const totalActive = summary.reduce((n, c) => n + c.activeCount, 0);
  return summary
    .map((c) => {
      const fullLabel = classLabel(c);
      const other = Math.max(0, c.totalCount - c.activeCount);
      return {
        classId: c.classId,
        label: shortLabel(fullLabel),
        fullLabel,
        active: c.activeCount,
        other,
        total: c.totalCount,
        pct: totalActive > 0 ? Math.round((c.activeCount / totalActive) * 1000) / 10 : 0,
        isUnassigned: c.classId === "unassigned",
      };
    })
    .sort((a, b) => b.active - a.active);
}

function StatPill({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{row.fullLabel}</p>
      <p className="mt-1 text-foreground">
        <span className="font-medium">{row.active}</span> active
        {row.other > 0 ? (
          <>
            {" "}
            · <span className="font-medium">{row.other}</span> other status
          </>
        ) : null}
      </p>
      <p className="text-muted-foreground">{row.pct}% of active learners school-wide</p>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: ChartRow }>;
}) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload;
  const value = payload[0].value ?? 0;
  if (!row) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{row.fullLabel}</p>
      <p className="mt-1 text-foreground">
        <span className="font-medium">{value}</span> active learners ({row.pct}%)
      </p>
    </div>
  );
}

function sliceColor(row: ChartRow, index: number): string {
  if (row.isUnassigned) return UNASSIGNED_COLOR;
  return CHART_COLORS[index % CHART_COLORS.length]!;
}

export function StudentEnrollmentCharts({ studentsHref = "/admin/students" }: { studentsHref?: string }) {
  const summaryQ = useClassEnrollmentSummary();

  const rows = useMemo(() => buildRows(summaryQ.data ?? []), [summaryQ.data]);

  const stats = useMemo(() => {
    const summary = summaryQ.data ?? [];
    const active = summary.reduce((n, c) => n + c.activeCount, 0);
    const enrolled = summary.reduce((n, c) => n + c.totalCount, 0);
    const unassigned = summary.find((c) => c.classId === "unassigned");
    const classCount = summary.filter((c) => c.classId !== "unassigned").length;
    return {
      active,
      enrolled,
      classCount,
      unassignedActive: unassigned?.activeCount ?? 0,
    };
  }, [summaryQ.data]);

  const barHeight = Math.max(280, Math.min(520, rows.length * 32));
  const pieData = rows.filter((r) => r.active > 0);

  if (summaryQ.isLoading) {
    return (
      <section className="space-y-4" aria-busy="true" aria-label="School enrollment charts loading">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
        <ChartSkeletonGrid count={2} />
      </section>
    );
  }

  if (summaryQ.isError) {
    return (
      <Alert tone="error">
        {summaryQ.error instanceof Error ? summaryQ.error.message : "Could not load enrollment summary"}
      </Alert>
    );
  }

  return (
    <section className="space-y-4" aria-label="School enrollment overview">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">School enrollment</h2>
          <p className="text-sm text-muted-foreground">
            Active learner distribution across classes in the current academic structure
          </p>
        </div>
        <Link
          href={studentsHref}
          className="text-sm font-medium text-brand hover:underline"
        >
          View student directory →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill label="Active learners" value={stats.active} hint="Currently active status" />
        <StatPill label="Total on roll" value={stats.enrolled} hint="All statuses in class lists" />
        <StatPill label="Classes" value={stats.classCount} hint="With at least one learner" />
        <StatPill
          label="Unassigned"
          value={stats.unassignedActive}
          hint={stats.unassignedActive > 0 ? "Needs class placement" : "All learners placed"}
        />
      </div>

      {rows.length === 0 ? (
        <ChartPanel title="Enrollment by class" empty>
          <span />
        </ChartPanel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel
            title="Active learners by class"
            subtitle="Sorted by class size — hover for full class name"
            chartHeight={barHeight}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/60" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={96}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip content={<DistributionTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  formatter={(value) => (value === "active" ? "Active" : "Other status")}
                />
                <Bar dataKey="active" name="active" stackId="a" radius={[0, 0, 0, 0]}>
                  {rows.map((row, i) => (
                    <Cell key={row.classId} fill={sliceColor(row, i)} />
                  ))}
                </Bar>
                <Bar dataKey="other" name="other" stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel
            title="Share of active enrollment"
            subtitle="Proportion of active learners in each class"
            empty={pieData.length === 0}
          >
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="active"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={1}
                  >
                    {pieData.map((row, i) => (
                      <Cell key={row.classId} fill={sliceColor(row, i)} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(_, entry) => {
                      const row = (entry as { payload?: ChartRow }).payload;
                      return row ? `${row.label} (${row.pct}%)` : "";
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </ChartPanel>
        </div>
      )}
    </section>
  );
}
