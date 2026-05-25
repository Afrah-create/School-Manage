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
import { CHART_COLORS, STATUS_COLORS } from "@/components/reports/chartTheme";

type StatusRow = {
  subject_id?: string;
  subject_name?: string;
  subject_code?: string;
  teacher_name?: string | null;
  status?: string;
};

function statusSummary(rows: StatusRow[]) {
  const submitted = rows.filter((r) => r.status === "Submitted").length;
  const draft = rows.length - submitted;
  return [
    { name: "Submitted", value: submitted },
    { name: "Draft", value: draft },
  ].filter((d) => d.value > 0);
}

function subjectStatusBars(rows: StatusRow[]) {
  return rows.map((r) => ({
    subject: `${r.subject_code ?? ""}`.trim() || (r.subject_name ?? "Subject"),
    submitted: r.status === "Submitted" ? 1 : 0,
    draft: r.status === "Submitted" ? 0 : 1,
  }));
}

function StatusPie({ rows, title }: { rows: StatusRow[]; title: string }) {
  const data = statusSummary(rows);
  return (
    <ChartPanel title={title} empty={data.length === 0}>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {data.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] ?? CHART_COLORS[0]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

function StatusBars({ rows, title }: { rows: StatusRow[]; title: string }) {
  const data = subjectStatusBars(rows);
  return (
    <ChartPanel title={title} subtitle="1 = full submission for that subject" empty={data.length === 0}>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 56 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="subject" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 9 }} />
            <YAxis domain={[0, 1]} ticks={[0, 1]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="submitted" name="Submitted" stackId="s" fill={STATUS_COLORS.Submitted} />
            <Bar dataKey="draft" name="Draft" stackId="s" fill={STATUS_COLORS.Draft} />
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}

export function ReadinessCharts({
  cbc,
  alevel,
}: {
  cbc: StatusRow[];
  alevel: StatusRow[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatusPie rows={cbc} title="CBC submission overview" />
      <StatusPie rows={alevel} title="A-Level submission overview" />
      <StatusBars rows={cbc} title="CBC status by subject" />
      <StatusBars rows={alevel} title="A-Level status by subject" />
    </div>
  );
}

export function DivisionChart({ divisions }: { divisions: Array<{ division: string; cnt: number }> }) {
  const data = divisions.map((d) => ({ name: d.division, count: d.cnt }));
  return (
    <ChartPanel title="A-Level division distribution" subtitle="From generated result records" empty={data.length === 0}>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="Students">
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </ChartPanel>
  );
}
