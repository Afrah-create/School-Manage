"use client";

import { useCallback, useMemo, useState } from "react";
import type { ExamEntriesMatrix, ExamStatus } from "@uganda-cbc-sms/shared";
import { AsyncContent } from "@/components/feedback/AsyncContent";
import { FormSkeleton } from "@/components/feedback/FormSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useExamEntriesActions, useExamEntriesMatrix } from "@/hooks/useExams";
import { getApiErrorMessage } from "@/lib/api";
import { queryStatus } from "@/lib/queryStatus";

function cellKey(studentId: string, subjectId: string) {
  return `${studentId}:${subjectId}`;
}

export function ExamStudentEntriesCard({
  examId,
  examStatus,
}: {
  examId: string;
  examStatus: ExamStatus;
}) {
  const entriesQ = useExamEntriesMatrix(examId);
  const actions = useExamEntriesActions(examId);
  const [localEntries, setLocalEntries] = useState<Record<string, string[]> | null>(null);
  const [feedback, setFeedback] = useState<{ ok?: string; err?: string }>({});

  const data = entriesQ.data;
  const entriesByStudent = localEntries ?? data?.entriesByStudent ?? {};
  const isDraft = examStatus === "draft";

  const enteredSet = useMemo(() => {
    const set = new Set<string>();
    for (const [studentId, subjectIds] of Object.entries(entriesByStudent)) {
      for (const subjectId of subjectIds) {
        set.add(cellKey(studentId, subjectId));
      }
    }
    return set;
  }, [entriesByStudent]);

  const toggleCell = useCallback(
    (studentId: string, subjectId: string, isCompulsory: boolean) => {
      if (!isDraft || isCompulsory) return;
      setLocalEntries((prev) => {
        const base = { ...(prev ?? data?.entriesByStudent ?? {}) };
        const list = new Set(base[studentId] ?? []);
        const key = subjectId;
        if (list.has(key)) list.delete(key);
        else list.add(key);
        base[studentId] = [...list];
        return base;
      });
    },
    [isDraft, data?.entriesByStudent],
  );

  const buildChanges = useCallback(
    (matrix: ExamEntriesMatrix) => {
      const changes: Array<{ studentId: string; subjectId: string; isEntered: boolean }> = [];
      const original = matrix.entriesByStudent;
      for (const st of matrix.students) {
        for (const paper of matrix.papers) {
          const was = (original[st.id] ?? []).includes(paper.subjectId);
          const now = (entriesByStudent[st.id] ?? []).includes(paper.subjectId);
          if (was !== now) {
            changes.push({ studentId: st.id, subjectId: paper.subjectId, isEntered: now });
          }
        }
      }
      return changes;
    },
    [entriesByStudent],
  );

  const applyPreset = async (preset: "compulsory_all_students" | "all_papers_all_students") => {
    setFeedback({});
    try {
      await actions.applyPreset.mutateAsync(preset);
      setLocalEntries(null);
      setFeedback({
        ok:
          preset === "compulsory_all_students"
            ? "All students registered for compulsory papers."
            : "All students registered for every paper on this exam.",
      });
      await entriesQ.refetch();
    } catch (e) {
      setFeedback({ err: getApiErrorMessage(e) });
    }
  };

  const save = async () => {
    if (!data) return;
    const changes = buildChanges(data);
    if (changes.length === 0) {
      setFeedback({ err: "No entry changes to save." });
      return;
    }
    setFeedback({});
    try {
      await actions.save.mutateAsync({ entries: changes });
      setLocalEntries(null);
      setFeedback({ ok: `Updated ${changes.length} registration(s).` });
      await entriesQ.refetch();
    } catch (e) {
      setFeedback({ err: getApiErrorMessage(e) });
    }
  };

  const status = queryStatus(entriesQ);

  return (
    <Card title="Student paper entries">
      <p className="mb-3 text-sm text-muted-foreground">
        Choose which students sit each optional paper. Compulsory papers include every student automatically.
        Teachers only see registered students when entering marks.
      </p>

      {feedback.ok ? (
        <div className="mb-3">
          <Alert tone="success">{feedback.ok}</Alert>
        </div>
      ) : null}
      {feedback.err ? (
        <div className="mb-3">
          <Alert tone="error">{feedback.err}</Alert>
        </div>
      ) : null}

      {!isDraft ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Entries are locked while the exam is open or closed. The matrix below is read-only.
        </p>
      ) : null}

      {isDraft ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            loading={actions.applyPreset.isPending}
            onClick={() => void applyPreset("compulsory_all_students")}
          >
            Register all for compulsory papers
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={actions.applyPreset.isPending}
            onClick={() => void applyPreset("all_papers_all_students")}
          >
            Register all for every paper
          </Button>
          <Button type="button" loading={actions.save.isPending} onClick={() => void save()}>
            Save entry changes
          </Button>
        </div>
      ) : null}

      <AsyncContent status={status} loading={<FormSkeleton fields={4} />} error={null}>
        {data && data.papers.length > 0 && data.students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="sticky left-0 z-10 bg-card py-2 pr-3 font-medium">Student</th>
                  {data.papers.map((p) => (
                    <th key={p.subjectId} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                      <span title={p.subjectName}>{p.subjectCode}</span>
                      <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                        {p.isCompulsory ? "All" : `${p.entrantsCount} entered`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.map((st) => (
                  <tr key={st.id} className="border-b border-border/60">
                    <td className="sticky left-0 z-10 bg-card py-2 pr-3">
                      <span className="font-medium">{st.fullName}</span>
                      <span className="block text-xs text-muted-foreground">{st.studentNumber}</span>
                    </td>
                    {data.papers.map((p) => {
                      const checked = enteredSet.has(cellKey(st.id, p.subjectId));
                      const disabled = !isDraft || p.isCompulsory;
                      return (
                        <td key={p.subjectId} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-brand disabled:opacity-60"
                            checked={p.isCompulsory ? true : checked}
                            disabled={disabled}
                            title={
                              p.isCompulsory
                                ? "Compulsory for all students"
                                : "Optional — toggle entry"
                            }
                            onChange={() => toggleCell(st.id, p.subjectId, p.isCompulsory)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <p className="text-sm text-muted-foreground">
            Add exam papers and ensure the class has active students before configuring entries.
          </p>
        ) : null}
      </AsyncContent>
    </Card>
  );
}
