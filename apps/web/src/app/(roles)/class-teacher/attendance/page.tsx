"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPost } from "@/lib/api";

export default function ClassTeacherAttendancePage() {
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<unknown[]>([]);
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<"present" | "absent" | "late">("present");
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      const r = await apiGet(
        `/attendance?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`,
      );
      setRows(r as unknown[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  const save = async () => {
    setErr(null);
    try {
      await apiPost("/attendance", { studentId, classId, date, status });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <PageWrapper title="Attendance" description="Daily register for your class">
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <Input label="Class ID" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button onClick={() => void load()}>Load register</Button>
      </div>
      <div className="mb-8 grid gap-3 md:grid-cols-3">
        <Input label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
        <Select
          label="Status"
          options={[
            { value: "present", label: "Present" },
            { value: "absent", label: "Absent" },
            { value: "late", label: "Late" },
          ]}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        />
        <Button onClick={() => void save()}>Save mark</Button>
      </div>
      {err ? <p className="text-red-600">{err}</p> : null}
      <pre className="max-h-96 overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
    </PageWrapper>
  );
}
