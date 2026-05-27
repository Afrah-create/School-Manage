"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useMyTeachingScope } from "@/hooks/useMyTeachingScope";
import { apiGet } from "@/lib/api";
import { classDisplayName } from "@/lib/academicLevel";

type RangeDay = {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  attendanceRate: number;
  registerStatus: "draft" | "submitted" | "locked";
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function ClassTeacherAttendanceHistoryPage() {
  const scope = useMyTeachingScope();

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of scope.homeroomClasses) {
      map.set(c.classId, classDisplayName({ name: c.className, stream: c.classStream }));
    }
    for (const c of scope.myClasses) {
      if (!map.has(c.classId)) {
        map.set(c.classId, classDisplayName({ name: c.className, stream: c.classStream }));
      }
    }
    for (const s of scope.subjectSlots) {
      if (!map.has(s.classId)) {
        map.set(s.classId, classDisplayName({ name: s.className, stream: s.classStream }));
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [scope.homeroomClasses, scope.myClasses, scope.subjectSlots]);

  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState(() => daysAgoIso(13));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<RangeDay[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId && classOptions[0]) {
      setClassId(classOptions[0].value);
    }
  }, [classId, classOptions]);

  const load = async () => {
    if (!classId) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await apiGet<RangeDay[]>(
        `/attendance/range?classId=${encodeURIComponent(classId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, from, to]);

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const daysWithData = rows.filter((r) => r.present + r.absent + r.late > 0);
    const avgRate =
      daysWithData.length > 0
        ? Math.round(
            (daysWithData.reduce((sum, r) => sum + r.attendanceRate, 0) / daysWithData.length) * 10,
          ) / 10
        : 0;
    const submitted = rows.filter((r) => r.registerStatus === "submitted" || r.registerStatus === "locked").length;
    return { avgRate, submitted, days: rows.length };
  }, [rows]);

  const noClasses = classOptions.length === 0 && !scope.isLoading;

  return (
    <PageWrapper title="Attendance history" description="Daily summaries for a class over a date range.">
      <p className="-mt-4 mb-4">
        <Link href="/class-teacher/attendance" className="text-sm font-medium text-brand hover:underline">
          Back to register
        </Link>
      </p>

      {err ? <Alert tone="error">{err}</Alert> : null}
      {noClasses ? (
        <Alert tone="info">
          No classes are assigned to you for {scope.activeYear?.name ?? "this year"}.
        </Alert>
      ) : null}

      <Card title="Date range">
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label="Class"
            options={classOptions}
            value={classId}
            disabled={classOptions.length === 0}
            onChange={(e) => setClassId(e.target.value)}
          />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" disabled={!classId} loading={loading} onClick={() => void load()}>
            Refresh
          </Button>
          {summary ? (
            <span className="text-xs text-muted-foreground">
              {summary.days} day(s) · avg rate {summary.avgRate}% · {summary.submitted} submitted
            </span>
          ) : null}
        </div>
      </Card>

      <div className="mt-4">
        <Card title="Daily summary">
          {loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for this range.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Present</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Absent</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Late</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Unmarked</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Rate</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {rows.map((row) => (
                    <tr key={row.date} className="transition-ui hover:bg-accent/40">
                      <td className="px-3 py-2 font-medium">{row.date}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                        {row.present}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-700 dark:text-red-400">
                        {row.absent}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-400">
                        {row.late}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {row.unmarked}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{row.attendanceRate}%</td>
                      <td className="px-3 py-2">
                        <Badge tone={row.registerStatus === "draft" ? "neutral" : "warning"}>
                          {row.registerStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
