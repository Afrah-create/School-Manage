"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

export default function HeadteacherAcademicPage() {
  const [years, setYears] = useState<unknown[]>([]);
  const [terms, setTerms] = useState<unknown[]>([]);
  const [classes, setClasses] = useState<unknown[]>([]);
  const [subjects, setSubjects] = useState<unknown[]>([]);
  const [combos, setCombos] = useState<unknown[]>([]);
  const [strands, setStrands] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [y, t, c, s, k, st] = await Promise.all([
          apiGet("/academic/years"),
          apiGet("/academic/terms"),
          apiGet("/academic/classes"),
          apiGet("/academic/subjects"),
          apiGet("/academic/combinations"),
          apiGet("/academic/cbc-strands"),
        ]);
        setYears(y as unknown[]);
        setTerms(t as unknown[]);
        setClasses(c as unknown[]);
        setSubjects(s as unknown[]);
        setCombos(k as unknown[]);
        setStrands(st as unknown[]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageWrapper title="Academic structure" description="Read-only reference">
      {loading ? <p className="text-slate-600">Loading…</p> : null}
      {err ? <p className="text-red-600">{err}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Academic years (${years.length})`}>
          <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(years, null, 2)}</pre>
        </Card>
        <Card title={`Terms (${terms.length})`}>
          <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(terms, null, 2)}</pre>
        </Card>
        <Card title={`Classes (${classes.length})`}>
          <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(classes, null, 2)}</pre>
        </Card>
        <Card title={`Subjects (${subjects.length})`}>
          <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(subjects, null, 2)}</pre>
        </Card>
        <Card title={`Combinations (${combos.length})`}>
          <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(combos, null, 2)}</pre>
        </Card>
        <Card title={`CBC strands (${strands.length})`}>
          <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(strands, null, 2)}</pre>
        </Card>
      </div>
    </PageWrapper>
  );
}
