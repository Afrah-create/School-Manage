"use client";

import { useEffect, useState } from "react";
import { CbcScoreGrid } from "@/components/assessment/CbcScoreGrid";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiGet } from "@/lib/api";

type IdName = {
  id: string;
  name?: string;
  studentNumber?: string;
  fullName?: string;
  classId?: string | null;
};
type Strand = { id: string; competencies: string[] };

export default function AdminCbcAssessmentPage() {
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [strandId, setStrandId] = useState("");
  const [students, setStudents] = useState<{ id: string; fullName: string; studentNumber: string }[]>(
    [],
  );
  const [strand, setStrand] = useState<Strand | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const [stu, strands] = await Promise.all([
        apiGet<IdName[]>(`/students`),
        apiGet<Strand[]>(
          subjectId ? `/academic/cbc-strands?subjectId=${encodeURIComponent(subjectId)}` : `/academic/cbc-strands`,
        ),
      ]);
      const filtered = stu.filter((s) => !classId || s.classId === classId);
      setStudents(
        filtered.map((s) => ({
          id: s.id,
          fullName: String((s as { fullName?: string }).fullName ?? ""),
          studentNumber: String((s as { studentNumber?: string }).studentNumber ?? ""),
        })),
      );
      const picked = strands.find((x) => x.id === strandId) ?? null;
      setStrand(picked);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- manual reload
  }, []);

  return (
    <PageWrapper title="CBC assessment" description="Enter A–D ratings per competency">
      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Input label="Class ID (UUID)" value={classId} onChange={(e) => setClassId(e.target.value)} />
        <Input label="Term ID (UUID)" value={termId} onChange={(e) => setTermId(e.target.value)} />
        <Input label="Subject ID (UUID)" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        <Input label="Strand ID (UUID)" value={strandId} onChange={(e) => setStrandId(e.target.value)} />
      </div>
      <Button onClick={() => void load()} loading={loading}>
        Reload data
      </Button>
      {err ? <p className="mt-4 text-red-600">{err}</p> : null}
      {strand && termId && subjectId ? (
        <div className="mt-8">
          <CbcScoreGrid
            students={students}
            competencies={strand.competencies}
            subjectId={subjectId}
            strandId={strand.id}
            termId={termId}
          />
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-600">
          Enter Class, Term, Subject, and Strand UUIDs from Academic structure, then reload.
        </p>
      )}
    </PageWrapper>
  );
}
