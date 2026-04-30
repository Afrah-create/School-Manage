"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";

const LINKS = [
  { href: "/admin/academic/years", title: "Academic years", desc: "Create and view school years" },
  { href: "/admin/academic/terms", title: "Terms", desc: "Terms within a year" },
  { href: "/admin/academic/classes", title: "Classes", desc: "Streams, levels, class teachers" },
  { href: "/admin/academic/subjects", title: "Subjects", desc: "Subject catalogue" },
];

export default function AdminAcademicHubPage() {
  const [counts, setCounts] = useState<{ y: number; t: number; c: number; s: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [y, t, c, s] = await Promise.all([
          apiGet<unknown[]>("/academic/years"),
          apiGet<unknown[]>("/academic/terms"),
          apiGet<unknown[]>("/academic/classes"),
          apiGet<unknown[]>("/academic/subjects"),
        ]);
        setCounts({ y: y.length, t: t.length, c: c.length, s: s.length });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageWrapper title="Academic" description="Structure, years, terms, classes, subjects">
      {loading ? <p className="animate-pulse text-slate-600">Loading summary…</p> : null}
      {err ? <p className="text-red-600">{err}</p> : null}
      {counts ? (
        <p className="mb-6 text-sm text-slate-600">
          {counts.y} years · {counts.t} terms · {counts.c} classes · {counts.s} subjects
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
            <div className="font-semibold text-brand">{l.title}</div>
            <p className="text-sm text-slate-600">{l.desc}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <Card title="Raw overview (all entities)">
          <p className="text-xs text-slate-500">
            For a combined JSON dump of combinations & strands, use the API directly or extend this view.
          </p>
        </Card>
      </div>
    </PageWrapper>
  );
}
