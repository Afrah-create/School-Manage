"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";

type Row = Record<string, unknown>;

export default function SubjectTeacherAlevelListPage() {
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (termId) qs.set("termId", termId);
      if (classId) qs.set("classId", classId);
      if (subjectId) qs.set("subjectId", subjectId);
      const q = qs.toString();
      const data = await apiGet<Row[]>(`/assessments/alevel${q ? `?${q}` : ""}`);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageWrapper title="A-Level assessment" description="Existing UNEB score rows">
      <div className="mb-4">
        <Link className="text-sm font-medium text-brand underline" href="/subject-teacher/assessment/alevel/entry">
          Open score entry table →
        </Link>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Input label="Term ID" value={termId} onChange={(e) => setTermId(e.target.value)} />
        <Input label="Class ID (optional)" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <Input label="Subject ID (optional)" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
      </div>
      <Button onClick={() => void load()} loading={loading}>
        Refresh
      </Button>
      {err ? <p className="mt-4 text-red-600">{err}</p> : null}
      <div className="mt-6">
        <Card title={`Rows (${rows.length})`}>
          <pre className="max-h-[480px] overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
        </Card>
      </div>
    </PageWrapper>
  );
}
