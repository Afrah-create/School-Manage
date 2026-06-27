"use client";

import {
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
import { CHART_COLORS, PIPELINE_COLORS } from "@/components/reports/chartTheme";

export type ReportTrackStats = {
  generated: number;
  approved: number;
  pendingApproval: number;
  notGenerated: number;
};

export type PipelineData = {
  activeStudents: number;
  cbc: ReportTrackStats;
  alevel: ReportTrackStats;
  approvalTimeline: Array<{ day: string; track: string; cnt: number }>;
};

function trackBarData(track: ReportTrackStats, label: string) {
  return [
    { name: label, approved: track.approved, pendingApproval: track.pendingApproval, notGenerated: track.notGenerated },
  ];
}

function mixPieData(pipeline: PipelineData) {
  return [
    { name: "O-Level reports", value: pipeline.cbc.generated },
    { name: "A-Level reports", value: pipeline.alevel.generated },
  ].filter((d) => d.value > 0);
}

function timelineSeries(timeline: PipelineData["approvalTimeline"]) {
  const byDay = new Map<string, { day: string; cbc: number; alevel: number }>();
  for (const row of timeline) {
    const existing = byDay.get(row.day) ?? { day: row.day, cbc: 0, alevel: 0 };
    if (row.track === "cbc") existing.cbc = row.cnt;
    else existing.alevel = row.cnt;
    byDay.set(row.day, existing);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function ReportPipelineCharts({ pipeline }: { pipeline: PipelineData }) {
  const cbcBars = trackBarData(pipeline.cbc, "O-Level");
  const alBars = trackBarData(pipeline.alevel, "A-Level");
  const mix = mixPieData(pipeline);
  const timeline = timelineSeries(pipeline.approvalTimeline);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartPanel title="O-Level report card pipeline" subtitle={`${pipeline.activeStudents} active students in class`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cbcBars} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={72} />
            <Tooltip />
            <Legend />
            <Bar dataKey="approved" name="Approved" stackId="a" fill={PIPELINE_COLORS.approved} />
            <Bar dataKey="pendingApproval" name="Awaiting approval" stackId="a" fill={PIPELINE_COLORS.pendingApproval} />
            <Bar dataKey="notGenerated" name="Not generated" stackId="a" fill={PIPELINE_COLORS.notGenerated} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="A-Level report pipeline" subtitle={`${pipeline.activeStudents} active students in class`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={alBars} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={72} />
            <Tooltip />
            <Legend />
            <Bar dataKey="approved" name="Approved" stackId="a" fill={PIPELINE_COLORS.approved} />
            <Bar dataKey="pendingApproval" name="Awaiting approval" stackId="a" fill={PIPELINE_COLORS.pendingApproval} />
            <Bar dataKey="notGenerated" name="Not generated" stackId="a" fill={PIPELINE_COLORS.notGenerated} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Report mix" subtitle="Generated report cards by track" empty={mix.length === 0}>
        {mix.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={mix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {mix.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </ChartPanel>

      <ChartPanel title="Approval timeline" subtitle="Cumulative approvals by day" empty={timeline.length === 0}>
        {timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline} margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cbc" name="O-Level" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="alevel" name="A-Level" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </ChartPanel>
    </div>
  );
}
