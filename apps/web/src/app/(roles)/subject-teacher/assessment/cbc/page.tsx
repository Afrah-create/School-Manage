"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";

type Row = {
  id: string;
  submitted?: boolean;
  student_name?: string;
  competency?: string;
  rating?: string;
};

export default function SubjectTeacherCbcListPage() {
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
      const data = await apiGet<Row[]>(`/assessments/cbc${q ? `?${q}` : ""}`);
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
    <PageWrapper title="CBC assessment" description="Score rows for your classes">
      <div className="mb-4">
        <Link className="text-sm font-medium text-brand underline" href="/subject-teacher/assessment/cbc/entry">
          Open score entry grid →
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
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-2">Student</th>
                <th className="py-2 pr-2">Competency</th>
                <th className="py-2 pr-2">Rating</th>
                <th className="py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{r.student_name}</td>
                  <td className="py-2 pr-2">{r.competency}</td>
                  <td className="py-2 pr-2">{r.rating}</td>
                  <td className="py-2">{r.submitted ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
