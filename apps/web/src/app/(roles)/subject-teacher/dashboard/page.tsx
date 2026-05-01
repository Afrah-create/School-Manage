"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DashboardErrorState,
  DashboardHeader,
  DashboardPanel,
  DashboardSkeleton,
  DashboardTwoColumn,
  KpiGrid,
} from "@/components/layout/shells/DashboardScaffold";
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

  const metrics = [
    { label: "Learners in scope", value: String(students.length), delta: "+2.0%", deltaTone: "positive" as const },
    { label: "Submitted rows", value: String(submitted), delta: "Marked", deltaTone: "neutral" as const },
    { label: "Pending rows", value: String(pending), delta: pending > 0 ? "Needs update" : "Completed", deltaTone: pending > 0 ? ("negative" as const) : ("positive" as const) },
    { label: "Active term", value: termId ? "Configured" : "Not set", delta: termId ? "Ready" : "Missing", deltaTone: termId ? ("positive" as const) : ("negative" as const) },
  ];

  return (
    <div className="space-y-6">
      <DashboardHeader title="Subject Teacher Dashboard" description="Assessment tracking and learner performance workflow." />
      {loading ? <DashboardSkeleton /> : null}
      {err ? <DashboardErrorState message={err} onRetry={() => window.location.reload()} /> : null}
      {!loading && !err ? (
        <>
          <KpiGrid metrics={metrics} />
          <DashboardTwoColumn
            primary={
              <DashboardPanel title="Learner snapshot">
                <div className="mb-3 flex items-center justify-end">
                  <button type="button" className="transition-ui inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50">
                    <FileDown className="h-4 w-4 stroke-[1.5]" />
                    Export
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Learner</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Assessment status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length ? (
                        students.slice(0, 8).map((student, idx) => {
                          const hasPending = idx < pending;
                          return (
                            <tr key={student.id} className="transition-ui border-t border-border/50 hover:bg-muted/40 dark:hover:bg-muted/30">
                              <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                                <Link className="hover:underline" href={`/subject-teacher/students/${student.id}`}>
                                  {student.fullName} ({student.studentNumber})
                                </Link>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${hasPending ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-green-500/10 text-green-700 dark:text-green-400"}`}>
                                  {hasPending ? "Pending" : "Submitted"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-12 text-center text-sm text-muted-foreground">
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </DashboardPanel>
            }
            secondary={
              <DashboardPanel title="Assessment actions">
                <div className="space-y-2 text-sm">
                  <Link href="/subject-teacher/assessment/cbc" className="block text-blue-600 hover:underline dark:text-blue-400">
                    Open CBC assessment
                  </Link>
                  <Link href="/subject-teacher/assessment/alevel" className="block text-blue-600 hover:underline dark:text-blue-400">
                    Open A-Level assessment
                  </Link>
                </div>
              </DashboardPanel>
            }
          />
        </>
      ) : null}
    </div>
  );
}
