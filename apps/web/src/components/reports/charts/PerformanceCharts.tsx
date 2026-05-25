"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPanel } from "@/components/reports/ChartPanel";
import { CBC_RATING_COLORS, CHART_COLORS } from "@/components/reports/chartTheme";

type CbcRow = { name: string; rating: string; cnt: number };
type AlevelRow = { name: string; avg_score: string };

function pivotCbcBySubject(rows: CbcRow[]) {
  const bySubject = new Map<string, Record<string, number | string>>();
  for (const row of rows) {
    const subj = row.name;
    const existing = bySubject.get(subj) ?? { subject: subj };
    existing[row.rating] = row.cnt;
    bySubject.set(subj, existing);
  }
  return [...bySubject.values()];
}

export function PerformanceCharts({
  cbc,
  alevel,
}: {
  cbc: CbcRow[];
  alevel: AlevelRow[];
}) {
  const cbcChart = pivotCbcBySubject(cbc);
  const alChart = alevel.map((r) => ({
    subject: r.name,
    avgScore: Number(r.avg_score),
  }));

  const ratingTotals = ["A", "B", "C", "D"].map((rating) => ({
    rating,
    count: cbc.filter((r) => r.rating === rating).reduce((s, r) => s + r.cnt, 0),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartPanel title="CBC ratings by subject" subtitle="Stacked counts per rating" empty={cbcChart.length === 0}>
        {cbcChart.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cbcChart} margin={{ bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="subject" angle={-25} textAnchor="end" height={70} interval={0} tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {(["A", "B", "C", "D"] as const).map((rating) => (
                <Bar key={rating} dataKey={rating} stackId="ratings" name={`Rating ${rating}`} fill={CBC_RATING_COLORS[rating]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartPanel>

      <ChartPanel title="CBC grade distribution" subtitle="All subjects combined" empty={ratingTotals.every((r) => r.count === 0)}>
        {ratingTotals.some((r) => r.count > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ratingTotals}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="rating" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Scores" fill={CHART_COLORS[0]}>
                {ratingTotals.map((entry) => (
                  <Cell key={entry.rating} fill={CBC_RATING_COLORS[entry.rating] ?? CHART_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartPanel>

      <ChartPanel
        title="A-Level average by subject"
        subtitle="Mean score (0–100)"
        empty={alChart.length === 0}
      >
        {alChart.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={alChart} margin={{ bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="subject" angle={-25} textAnchor="end" height={70} interval={0} tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v: number) => [v.toFixed(1), "Avg score"]} />
              <Bar dataKey="avgScore" name="Avg score" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </ChartPanel>
    </div>
  );
}
