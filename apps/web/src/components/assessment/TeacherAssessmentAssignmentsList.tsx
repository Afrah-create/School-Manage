"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/TableSkeleton";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table, type Column } from "@/components/ui/Table";
import {
  useAssessmentAssignments,
  useAssessmentTerms,
  useAssessmentYears,
  type AssessmentAssignmentRow,
} from "@/hooks/useAssessmentAssignments";
import { manualStatus } from "@/lib/queryStatus";

type Props = {
  track: "cbc" | "alevel";
  emptyTitle: string;
  emptyDescription: string;
};

export function TeacherAssessmentAssignmentsList({
  track,
  emptyTitle,
  emptyDescription,
}: Props) {
  const pathname = usePathname();
  const roleBase = pathname.includes("/class-teacher/") ? "/class-teacher" : "/subject-teacher";
  const entryPath = `${roleBase}/assessment/${track}/entry`;
  const yearsQ = useAssessmentYears();
  const [yearId, setYearId] = useState("");
  const termsQ = useAssessmentTerms(yearId);
  const [termId, setTermId] = useState("");

  const years = yearsQ.data ?? [];
  const terms = termsQ.data ?? [];

  useEffect(() => {
    if (years[0] && !yearId) setYearId(years[0].id);
  }, [years, yearId]);

  useEffect(() => {
    if (!yearId) return;
    if (termId && terms.some((t) => t.id === termId)) return;
    setTermId(terms[0]?.id ?? "");
  }, [yearId, terms, termId]);

  const assignments = useAssessmentAssignments(yearId, termId || undefined);
  const status = manualStatus({
    loading: assignments.isLoading,
    error: assignments.isError ? assignments.error : undefined,
    data: assignments.rows,
    isEmpty: (d) => Array.isArray(d) && d.length === 0,
  });

  const entryHref = (row: AssessmentAssignmentRow) => {
    const qp = new URLSearchParams({
      classId: row.classId,
      subjectId: row.subjectId,
      yearId,
      termId,
      track,
    });
    return `${entryPath}?${qp.toString()}`;
  };

  const columns: Column<AssessmentAssignmentRow>[] = [
    {
      key: "subject",
      header: "Your subject",
      render: (r) => (
        <div>
          <div className="font-medium">
            {r.subjectCode} — {r.subjectName}
          </div>
          <div className="text-xs text-muted-foreground">
            {track === "cbc" ? "CBC competency ratings" : "A-Level UNEB scores"}
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (r) => (
        <span>
          {r.className}
          {r.classStream ? ` · ${r.classStream}` : ""}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      render: (r) => (
        <Link className="text-sm font-medium text-brand underline" href={entryHref(r)}>
          Enter marks
        </Link>
      ),
    },
  ];

  const yearOptions = useMemo(
    () =>
      years.length
        ? years.map((y) => ({ value: y.id, label: y.name }))
        : [{ value: "", label: "No academic years" }],
    [years],
  );

  const termOptions = useMemo(
    () =>
      terms.length
        ? terms.map((t) => ({ value: t.id, label: `Term ${t.termNumber}` }))
        : [{ value: "", label: yearId ? "No terms for this year" : "Select a year first" }],
    [terms, yearId],
  );

  return (
    <div className="space-y-4">
      <Card title="Assessment period">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Academic year"
            options={yearOptions}
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setTermId("");
            }}
          />
          <Select
            label="Term"
            options={termOptions}
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          />
        </div>
      </Card>

      <AsyncContent
        status={status}
        loading={<TableSkeleton rows={6} cols={3} />}
        error={
          <ErrorState
            message={
              assignments.error instanceof Error
                ? assignments.error.message
                : "We couldn't load your class–subject assignments."
            }
            onRetry={() => void assignments.refetch()}
          />
        }
        empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
      >
        <Table
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          rows={assignments.rows as unknown as Record<string, unknown>[]}
        />
      </AsyncContent>
    </div>
  );
}
