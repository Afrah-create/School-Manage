"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPanel } from "@/components/reports/ChartPanel";
import { CHART_COLORS } from "@/components/reports/chartTheme";
import { classDisplayName, levelShortLabel } from "@/lib/academicLevel";
import type { AttendanceAdminOverview } from "@/hooks/useAttendanceAdmin";

const STATUS_COLORS = {
  present: "#16a34a",
  absent: "#dc2626",
  late: "#d97706",
};

const COMPLIANCE_COLORS = {
  submitted: "#16a34a",
  draft: "#94a3b8",
  missing: "#f97316",
};

function shortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

export function AttendanceAdminKpis({ kpis }: { kpis: AttendanceAdminOverview["kpis"] }) {
  const submitPct =
    kpis.classCount > 0 && kpis.schoolDays > 0
      ? Math.round(
          (kpis.registersSubmitted / Math.max(kpis.classCount * kpis.schoolDays, 1)) * 1000,
        ) / 10
      : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <StatPill label="Active learners" value={kpis.activeStudents} hint={`${kpis.classCount} classes`} />
      <StatPill label="Avg attendance" value={`${kpis.avgAttendanceRate}%`} hint="Present + late / marked" />
      <StatPill label="Absent (period)" value={kpis.absent} hint={`${kpis.schoolDays} day range`} />
      <StatPill label="Late (period)" value={kpis.late} />
      <StatPill label="Registers submitted" value={kpis.registersSubmitted} hint={`${submitPct}% of class-days`} />
      <StatPill
        label="Missing registers"
        value={kpis.registersMissing}
        hint={`${kpis.registersDraft} still in draft`}
      />
    </div>
  );
}

export function AttendanceAdminCharts({ data }: { data: AttendanceAdminOverview }) {
  const trendChart = useMemo(
    () =>
      data.trend.map((d) => ({
        ...d,
        label: shortDate(d.date),
      })),
    [data.trend],
  );

  const statusPie = useMemo(
    () => [
      { name: "Present", value: data.statusBreakdown.present, key: "present" },
      { name: "Absent", value: data.statusBreakdown.absent, key: "absent" },
      { name: "Late", value: data.statusBreakdown.late, key: "late" },
    ],
    [data.statusBreakdown],
  );

  const compliancePie = useMemo(
    () => [
      { name: "Submitted", value: data.registerCompliance.submitted, key: "submitted" },
      { name: "Draft", value: data.registerCompliance.draft, key: "draft" },
      { name: "Missing", value: data.registerCompliance.missing, key: "missing" },
    ],
    [data.registerCompliance],
  );

  const classBars = useMemo(() => {
    return [...data.byClass]
      .filter((c) => c.activeStudents > 0)
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 16)
      .map((c, i) => ({
        classId: c.classId,
        label: classDisplayName({ name: c.className, stream: c.classStream }),
        level: levelShortLabel(c.level),
        attendanceRate: c.attendanceRate,
        absent: c.absent,
        color: CHART_COLORS[i % CHART_COLORS.length]!,
      }));
  }, [data.byClass]);

  const dailyStatusStack = useMemo(
    () =>
      trendChart.map((d) => ({
        label: d.label,
        present: d.present,
        absent: d.absent,
        late: d.late,
      })),
    [trendChart],
  );

  const statusEmpty = statusPie.every((s) => s.value === 0);
  const complianceEmpty = compliancePie.every((s) => s.value === 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Attendance rate trend"
          subtitle="School-wide daily rate (present + late ÷ active learners)"
          empty={trendChart.length === 0}
          chartHeight={300}
        >
          {trendChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Rate"]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { date?: string } | undefined;
                    return row?.date ?? "";
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="attendanceRate"
                  name="Attendance rate"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </ChartPanel>

        <ChartPanel
          title="Daily marks volume"
          subtitle="Present, absent, and late counts per day"
          empty={dailyStatusStack.length === 0}
          chartHeight={300}
        >
          {dailyStatusStack.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStatusStack} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} width={44} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="present"
                  stackId="1"
                  name="Present"
                  fill={STATUS_COLORS.present}
                  stroke={STATUS_COLORS.present}
                />
                <Area
                  type="monotone"
                  dataKey="late"
                  stackId="1"
                  name="Late"
                  fill={STATUS_COLORS.late}
                  stroke={STATUS_COLORS.late}
                />
                <Area
                  type="monotone"
                  dataKey="absent"
                  stackId="1"
                  name="Absent"
                  fill={STATUS_COLORS.absent}
                  stroke={STATUS_COLORS.absent}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </ChartPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel title="Status breakdown" subtitle="All marks in selected period" empty={statusEmpty}>
          {!statusEmpty ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
                  {statusPie.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={STATUS_COLORS[entry.key as keyof typeof STATUS_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </ChartPanel>

        <ChartPanel
          title="Register compliance"
          subtitle="Class-day registers in range"
          empty={complianceEmpty}
        >
          {!complianceEmpty ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compliancePie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {compliancePie.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={COMPLIANCE_COLORS[entry.key as keyof typeof COMPLIANCE_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </ChartPanel>

        <ChartPanel
          title="Attendance by class"
          subtitle="Top classes by rate (marked learners)"
          empty={classBars.length === 0}
          chartHeight={300}
        >
          {classBars.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classBars} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Rate"]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { level?: string } | undefined;
                    return row?.level ? `${row.level}` : "";
                  }}
                />
                <Bar dataKey="attendanceRate" name="Rate" radius={[0, 4, 4, 0]}>
                  {classBars.map((row) => (
                    <Cell key={row.classId} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </ChartPanel>
      </div>

      <ClassAttendanceTable rows={data.byClass} />
    </div>
  );
}

function ClassAttendanceTable({ rows }: { rows: AttendanceAdminOverview["byClass"] }) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.className.localeCompare(b.className) || a.classStream.localeCompare(b.classStream)),
    [rows],
  );

  if (sorted.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No classes match the selected filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Class</th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Level</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Learners</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Present</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Absent</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Late</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Rate</th>
            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Registers</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((row) => {
            const submitPct =
              row.registerDaysExpected > 0
                ? Math.round((row.registersSubmitted / row.registerDaysExpected) * 1000) / 10
                : 0;
            return (
              <tr key={row.classId} className="transition-ui hover:bg-accent/40">
                <td className="px-3 py-2 font-medium">
                  {classDisplayName({ name: row.className, stream: row.classStream })}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{levelShortLabel(row.level)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.activeStudents}</td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                  {row.present}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-red-700 dark:text-red-400">
                  {row.absent}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-400">
                  {row.late}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{row.attendanceRate}%</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {row.registersSubmitted}/{row.registerDaysExpected} ({submitPct}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
