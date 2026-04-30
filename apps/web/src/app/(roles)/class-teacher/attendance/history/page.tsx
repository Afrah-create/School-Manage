"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";

export default function ClassTeacherAttendanceHistoryPage() {
  const [classId, setClassId] = useState("");
  const [baseDate, setBaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(7);
  const [bundle, setBundle] = useState<Record<string, unknown>>({});
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const out: Record<string, unknown> = {};
      const d0 = new Date(baseDate + "T12:00:00");
      for (let i = 0; i < days; i++) {
        const dt = new Date(d0);
        dt.setDate(dt.getDate() - i);
        const ds = dt.toISOString().slice(0, 10);
        const rows = await apiGet(
          `/attendance?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(ds)}`,
        );
        out[ds] = rows;
      }
      setBundle(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper title="Attendance history" description="Past registers (one API call per day)">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input label="Class ID" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <Input label="End date" type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)} />
        <Input
          label="Days back"
          type="number"
          min={1}
          max={31}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
        <Button onClick={() => void load()} loading={loading}>
          Load range
        </Button>
      </div>
      {err ? <p className="text-red-600">{err}</p> : null}
      <Card title="Registers by date">
        <pre className="max-h-[480px] overflow-auto text-xs">{JSON.stringify(bundle, null, 2)}</pre>
      </Card>
    </PageWrapper>
  );
}
