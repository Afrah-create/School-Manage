"use client";

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
import { ChartPanel } from "@/components/reports/ChartPanel";
import { CHART_COLORS } from "@/components/reports/chartTheme";
import type { InvoiceFinanceStats } from "@/lib/feeFinanceStats";
import { formatUgxFull } from "@/lib/formatMoney";

const COLLECTED_COLOR = "#16a34a";
const OUTSTANDING_COLOR = "#d97706";
const ARREARS_COLOR = "#dc2626";

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-md">
      {label ? <p className="mb-1 font-medium text-foreground">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.name} className="tabular-nums text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-foreground">{formatUgxFull(p.value ?? 0)} UGX</span>
        </p>
      ))}
    </div>
  );
}

export function FeeCollectionCharts({ stats }: { stats: InvoiceFinanceStats }) {
  const pieData = [
    { name: "Collected", value: stats.collectedOnInvoicesUgx, color: COLLECTED_COLOR },
    { name: "Outstanding", value: stats.outstandingUgx, color: OUTSTANDING_COLOR },
  ].filter((d) => d.value > 0);

  const unpaidOnly = Math.max(0, stats.active - stats.partial);
  const statusData = [
    { name: "Paid in full", count: stats.paid, fill: COLLECTED_COLOR },
    { name: "Partially paid", count: stats.partial, fill: CHART_COLORS[1] },
    { name: "Not paid", count: unpaidOnly, fill: OUTSTANDING_COLOR },
    { name: "Arrears flagged", count: stats.arrears, fill: ARREARS_COLOR },
  ].filter((d) => d.count > 0);

  const collectionPct =
    stats.billedUgx > 0 ? Math.min(100, Math.round((stats.collectedOnInvoicesUgx / stats.billedUgx) * 100)) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartPanel
        title="Collection split"
        subtitle={`${collectionPct}% of billed amount collected`}
        empty={pieData.length === 0}
        chartHeight={260}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={2}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<MoneyTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        title="Invoices by status"
        subtitle={`${stats.total} invoice${stats.total === 1 ? "" : "s"} on record`}
        empty={statusData.length === 0}
        chartHeight={260}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusData} margin={{ bottom: 8, left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={52} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
            <Tooltip
              formatter={(value: number) => [`${value} students`, "Invoices"]}
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {statusData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}
