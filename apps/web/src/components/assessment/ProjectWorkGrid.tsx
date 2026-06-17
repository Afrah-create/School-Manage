"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_ASSESSMENT_CONFIG, type AssessmentConfig } from "@uganda-cbc-sms/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Table, type Column } from "@/components/ui/Table";
import { apiGet, apiPost, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

type ProjectRow = {
  studentId: string;
  fullName: string;
  studentNumber: string;
  scores: Record<number, { score: string; maxScore: string }>;
};

type ApiScore = {
  studentId: string;
  projectNumber: number;
  score: number;
  maxScore: number;
  studentName?: string;
  studentNumber?: string;
};

export function ProjectWorkGrid({
  classId,
  subjectId,
  termId,
  yearId,
  students,
}: {
  classId: string;
  subjectId: string;
  termId: string;
  yearId: string;
  students: Array<{ id: string; fullName: string; studentNumber: string }>;
}) {
  const [expectedPerTerm, setExpectedPerTerm] = useState(
    DEFAULT_ASSESSMENT_CONFIG.projectWork.expectedPerTerm,
  );
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const projectNumbers = useMemo(
    () => Array.from({ length: expectedPerTerm }, (_, i) => i + 1),
    [expectedPerTerm],
  );

  const initRows = useCallback(
    (apiRows: ApiScore[]) => {
      const byStudent = new Map<string, ProjectRow>();
      for (const st of students) {
        byStudent.set(st.id, {
          studentId: st.id,
          fullName: st.fullName,
          studentNumber: st.studentNumber,
          scores: Object.fromEntries(
            projectNumbers.map((n) => [n, { score: "", maxScore: "100" }]),
          ),
        });
      }
      for (const r of apiRows) {
        const row = byStudent.get(r.studentId);
        if (!row) continue;
        row.scores[r.projectNumber] = {
          score: String(r.score),
          maxScore: String(r.maxScore),
        };
      }
      setRows([...byStudent.values()]);
    },
    [students, projectNumbers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [config, scores] = await Promise.all([
        apiGet<AssessmentConfig>("/settings/assessment-config"),
        apiGet<ApiScore[]>(
          `/assessments/project-work?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}&termId=${encodeURIComponent(termId)}&yearId=${encodeURIComponent(yearId)}`,
        ),
      ]);
      setExpectedPerTerm(config.projectWork?.expectedPerTerm ?? 4);
      initRows(scores);
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not load project work");
    } finally {
      setLoading(false);
    }
  }, [classId, subjectId, termId, yearId, initRows]);

  useEffect(() => {
    void load();
  }, [load]);

  const setCell = (studentId: string, projectNumber: number, field: "score" | "maxScore", value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? {
              ...r,
              scores: {
                ...r.scores,
                [projectNumber]: { ...r.scores[projectNumber], [field]: value },
              },
            }
          : r,
      ),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const scores = rows.flatMap((r) =>
        projectNumbers.map((n) => {
          const cell = r.scores[n];
          const raw = cell?.score?.trim();
          return {
            studentId: r.studentId,
            projectNumber: n,
            score: raw === "" || raw == null ? null : Number(raw),
            maxScore: Number(cell?.maxScore || 100),
          };
        }),
      );
      await apiPost("/assessments/project-work/bulk", {
        classId,
        subjectId,
        termId,
        yearId,
        scores,
      });
      toast.success(
        "Project work saved. Ask admin to run O-Level grade recalculation before publishing report cards.",
        "Saved",
      );
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e), "Could not save project work");
    } finally {
      setSaving(false);
    }
  };

  type TableRow = ProjectRow & Record<string, unknown>;

  const columns: Column<TableRow>[] = [
    { key: "studentNumber", header: "No." },
    { key: "fullName", header: "Student" },
    ...projectNumbers.map((n) => ({
      key: `p${n}`,
      header: `Project ${n}`,
      render: (r: TableRow) => (
        <div className="flex gap-1">
          <input
            type="number"
            min={0}
            className="w-14 rounded border border-border bg-background px-1 py-0.5 text-sm"
            value={r.scores[n]?.score ?? ""}
            onChange={(e) => setCell(r.studentId, n, "score", e.target.value)}
          />
          <span className="text-muted-foreground">/</span>
          <input
            type="number"
            min={1}
            className="w-12 rounded border border-border bg-background px-1 py-0.5 text-sm"
            value={r.scores[n]?.maxScore ?? "100"}
            onChange={(e) => setCell(r.studentId, n, "maxScore", e.target.value)}
          />
        </div>
      ),
    })),
  ];

  if (loading) return <p className="text-sm text-muted-foreground">Loading project work…</p>;

  return (
    <div className="space-y-3">
      <Alert tone="info">
        Project work is the <strong>official CA source</strong> (NCDC marking scheme). Strand ratings are
        provisional fallback only. Composites update after admin runs O-Level grade recalculation.
      </Alert>
      <Table columns={columns as Column<TableRow>[]} rows={rows as TableRow[]} pageSize={50} />
      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save project work"}
      </Button>
    </div>
  );
}
