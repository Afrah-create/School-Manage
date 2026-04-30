"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiGet, apiPatch } from "@/lib/api";

type CbcRow = {
  id: string;
  submitted?: boolean;
  student_name?: string;
  student_number?: string;
  competency?: string;
  rating?: string;
};

export default function HeadteacherCbcUnlockPage() {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [rows, setRows] = useState<CbcRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (classId) qs.set("classId", classId);
      if (subjectId) qs.set("subjectId", subjectId);
      if (termId) qs.set("termId", termId);
      const q = qs.toString();
      const data = await apiGet<CbcRow[]>(`/assessments/cbc${q ? `?${q}` : ""}`);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = async (id: string) => {
    setErr(null);
    setMsg(null);
    try {
      await apiPatch(`/assessments/cbc/${encodeURIComponent(id)}/unlock`, {});
      setMsg("Unlocked");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unlock failed");
    }
  };

  const submitted = rows.filter((r) => r.submitted === true);

  return (
    <PageWrapper title="Unlock CBC scores" description="Filter by class / subject / term">
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Input label="Class ID (optional)" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <Input label="Subject ID (optional)" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        <Input label="Term ID (optional)" value={termId} onChange={(e) => setTermId(e.target.value)} />
      </div>
      <Button onClick={() => void load()} loading={loading}>
        Apply filters
      </Button>
      {err ? <p className="mt-4 text-red-600">{err}</p> : null}
      {msg ? <p className="mt-4 text-emerald-700">{msg}</p> : null}

      <Card title={`Submitted rows (${submitted.length} of ${rows.length})`}>
        <div className="overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-2">Student</th>
                <th className="py-2 pr-2">Competency</th>
                <th className="py-2 pr-2">Rating</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {submitted.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">
                    {r.student_name ?? "—"}{" "}
                    <span className="text-xs text-slate-500">{r.student_number}</span>
                  </td>
                  <td className="py-2 pr-2">{r.competency}</td>
                  <td className="py-2 pr-2">{r.rating}</td>
                  <td className="py-2">
                    <Button type="button" variant="secondary" onClick={() => void unlock(r.id)}>
                      Unlock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageWrapper>
  );
}
