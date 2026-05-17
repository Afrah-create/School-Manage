"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

const LINKS = [
  { href: "/admin/academic/years", title: "Academic years", desc: "Create and view school years" },
  { href: "/admin/academic/terms", title: "Terms", desc: "Terms within a year" },
  { href: "/admin/academic/classes", title: "Classes", desc: "Streams, levels, class teachers" },
  { href: "/admin/academic/subjects", title: "Subjects", desc: "Subject catalogue" },
  { href: "/admin/academic/class-subjects", title: "Class-subject assignments", desc: "Assign subjects to classes" },
  {
    href: "/admin/academic/class-teachers",
    title: "Class teachers",
    desc: "Assign multiple teachers per class (homeroom head + others)",
  },
  {
    href: "/admin/academic/teacher-assignments",
    title: "Teacher workload",
    desc: "Allocate teachers to class subjects by year (teachable-subject matching)",
  },
  { href: "/admin/academic/combinations", title: "Subject combinations", desc: "Manage O-Level and A-Level combinations" },
  { href: "/admin/academic/cbc-strands", title: "CBC strands", desc: "Manage strands and sub-strands" },
  { href: "/admin/academic/grading-scales", title: "Grading scales", desc: "Define grade ranges, points, and descriptors" },
];

export default function AdminAcademicHubPage() {
  const [counts, setCounts] = useState<{
    y: number;
    t: number;
    c: number;
    s: number;
    cs: number;
    k: number;
    st: number;
    gs: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [y, t, c, s, cs, k, st, gs] = await Promise.all([
          apiGet<unknown[]>("/academic/years"),
          apiGet<unknown[]>("/academic/terms"),
          apiGet<unknown[]>("/academic/classes"),
          apiGet<unknown[]>("/academic/subjects"),
          apiGet<unknown[]>("/academic/class-subjects"),
          apiGet<unknown[]>("/academic/combinations"),
          apiGet<unknown[]>("/academic/cbc-strands"),
          apiGet<unknown[]>("/academic/grading-scales"),
        ]);
        setCounts({
          y: y.length,
          t: t.length,
          c: c.length,
          s: s.length,
          cs: cs.length,
          k: k.length,
          st: st.length,
          gs: gs.length,
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageWrapper title="Academic" description="Structure, years, terms, classes, subjects">
      {loading ? <p className="animate-pulse text-muted-foreground">Loading summary…</p> : null}
      {err ? <Alert tone="error">{err}</Alert> : null}
      {counts ? (
        <p className="mb-6 mt-3 text-sm text-muted-foreground">
          {counts.y} years · {counts.t} terms · {counts.c} classes · {counts.s} subjects · {counts.cs} assignments · {counts.k} combinations · {counts.st} strands · {counts.gs} grade bands
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-lg border border-border bg-card p-4 transition-ui hover:bg-accent"
          >
            <div className="font-semibold text-brand">{l.title}</div>
            <p className="text-sm text-muted-foreground">{l.desc}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <Card title="Instructional structure">
          <p className="text-xs text-muted-foreground">
            Manage class-subject assignments, combinations, and CBC learning structure from the links above.
          </p>
        </Card>
      </div>
    </PageWrapper>
  );
}
