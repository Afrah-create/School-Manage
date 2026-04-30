"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

type TermRow = { id: string; isActive?: boolean; termNumber?: number };
type CbcRow = { submitted?: boolean; id: string };
type Stu = { id: string; fullName: string; studentNumber: string };

export default function SubjectTeacherDashboardPage() {
  const [students, setStudents] = useState<Stu[]>([]);
  const [termId, setTermId] = useState<string | null>(null);
  const [cbcRows, setCbcRows] = useState<CbcRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [stu, terms] = await Promise.all([
          apiGet<Stu[]>("/students"),
          apiGet<TermRow[]>("/academic/terms"),
        ]);
        setStudents(stu);
        const active = terms.find((t) => t.isActive) ?? terms[0] ?? null;
        setTermId(active?.id ?? null);
        if (active?.id) {
          const rows = await apiGet<CbcRow[]>(`/assessments/cbc?termId=${encodeURIComponent(active.id)}`);
          setCbcRows(rows);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submitted = cbcRows.filter((r) => r.submitted).length;
  const pending = cbcRows.length - submitted;

  return (
    <PageWrapper title="Dashboard" description="Assessment focus">
      {loading ? <p className="animate-pulse text-slate-600">Loading…</p> : null}
      {err ? (
        <Card title="Error">
          <p className="text-red-600">{err}</p>
        </Card>
      ) : null}
      {!loading && !err ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="My learners (API scope)">
              <p className="text-2xl font-bold text-brand">{students.length}</p>
              <ul className="mt-2 max-h-40 list-inside list-disc overflow-auto text-sm">
                {students.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <Link className="text-brand underline" href={`/subject-teacher/students/${s.id}`}>
                      {s.fullName}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={termId ? "CBC scores (this term, all rows)" : "CBC scores"}>
              {termId ? (
                <>
                  <p className="text-sm text-slate-600">
                    Submitted rows: {submitted}. Not submitted: {pending}. Total rows: {cbcRows.length}.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Row-level list from <code className="rounded bg-slate-100 px-1">GET /assessments/cbc?termId</code>
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-600">No term found — create an active term in Academic.</p>
              )}
            </Card>
          </div>

          <Card title="My assigned subjects">
            <p className="text-sm text-slate-600">
              Requires backend support:{" "}
              <code className="rounded bg-slate-100 px-1">GET /api/academic/class-subjects?teacherId=me</code> (or
              similar) to list only your subjects. Use Assessment pages with manual subject UUIDs for now.
            </p>
          </Card>
        </div>
      ) : null}
    </PageWrapper>
  );
}
