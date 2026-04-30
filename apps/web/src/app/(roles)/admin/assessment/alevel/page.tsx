"use client";

import { useEffect, useState } from "react";
import { ALevelScoreTable } from "@/components/assessment/ALevelScoreTable";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";

export default function AdminAlevelAssessmentPage() {
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [students, setStudents] = useState<
    { id: string; fullName: string; studentNumber: string }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const stu = await apiGet<{ id: string; fullName?: string; studentNumber?: string; classId?: string }[]>(
        "/students",
      );
      const filtered = classId ? stu.filter((s) => s.classId === classId) : stu;
      setStudents(
        filtered.map((s) => ({
          id: s.id,
          fullName: String(s.fullName ?? ""),
          studentNumber: String(s.studentNumber ?? ""),
        })),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount
  }, []);

  return (
    <PageWrapper title="A-Level assessment" description="UNEB scores (0–100)">
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Input label="Class ID (UUID)" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <Input label="Term ID (UUID)" value={termId} onChange={(e) => setTermId(e.target.value)} />
        <Input label="Subject ID (UUID)" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
      </div>
      <Button onClick={() => void load()} loading={loading}>
        Reload students
      </Button>
      {err ? <p className="mt-4 text-red-600">{err}</p> : null}
      {termId && subjectId ? (
        <div className="mt-8">
          <ALevelScoreTable students={students} subjectId={subjectId} termId={termId} />
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-600">Enter Term and Subject UUIDs to enable entry.</p>
      )}
    </PageWrapper>
  );
}
