"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { computeGradeForLevel } from "@/utils/gradingClient";
import type { GradingScaleRow } from "@/hooks/useGradingScales";
import type { AcademicLevel } from "@/lib/academicLevel";

type StudentRow = {
  id: string;
  fullName: string;
  studentNumber: string;
  score: number | null;
  isLocked: boolean;
};

export function ExamScoreGrid({
  students,
  maxScore,
  level,
  gradingScaleRows,
  readOnly,
  onSave,
  onSubmit,
  saving,
  submitting,
}: {
  students: StudentRow[];
  maxScore: number;
  level: AcademicLevel;
  gradingScaleRows?: GradingScaleRow[];
  readOnly?: boolean;
  onSave: (items: Array<{ studentId: string; score: number }>) => Promise<void>;
  onSubmit: () => void | Promise<void>;
  saving?: boolean;
  submitting?: boolean;
}) {
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const s of students) {
      if (s.score != null) initial[s.id] = String(s.score);
    }
    setScores(initial);
  }, [students]);

  const parsed = useMemo(
    () =>
      students.map((s) => {
        const raw = scores[s.id];
        const score = raw === undefined || raw === "" ? null : Number(raw);
        const valid =
          score !== null && !Number.isNaN(score) && score >= 0 && score <= maxScore;
        const out =
          valid && score !== null ? computeGradeForLevel(score, level, gradingScaleRows) : null;
        return { ...s, score, valid, out };
      }),
    [gradingScaleRows, level, maxScore, scores, students],
  );

  const hasEditable = !readOnly && students.some((s) => !s.isLocked);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enter scores from 0 to {maxScore}. Letter grades and points use the{" "}
        {level === "A_LEVEL" ? "A-Level (UNEB)" : "O-Level numeric"} grading scale
        {level === "O_LEVEL" ? " — not CBC competency ratings" : ""}.
      </p>
      <div className="overflow-x-auto rounded border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-2 py-2 text-left">Student</th>
              <th className="px-2 py-2 text-left">Score</th>
              <th className="px-2 py-2 text-left">Grade</th>
              {level === "A_LEVEL" ? <th className="px-2 py-2 text-left">Points</th> : null}
            </tr>
          </thead>
          <tbody>
            {parsed.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-2 py-2">
                  <div className="font-medium">{row.fullName}</div>
                  <div className="text-xs text-muted-foreground">{row.studentNumber}</div>
                </td>
                <td className="px-2 py-2">
                  {readOnly || row.isLocked ? (
                    <span>{row.score != null ? row.score : "—"}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      max={maxScore}
                      step={0.01}
                      value={scores[row.id] ?? ""}
                      onChange={(e) => setScores((p) => ({ ...p, [row.id]: e.target.value }))}
                      error={
                        scores[row.id] && !row.valid
                          ? `Enter a score between 0 and ${maxScore}`
                          : undefined
                      }
                    />
                  )}
                </td>
                <td className="px-2 py-2">{row.out?.grade ?? "—"}</td>
                {level === "A_LEVEL" ? <td className="px-2 py-2">{row.out?.points ?? "—"}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasEditable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            loading={saving}
            onClick={() =>
              void onSave(
                parsed
                  .filter((p) => p.valid && p.score != null && !p.isLocked)
                  .map((p) => ({ studentId: p.id, score: Number(p.score) })),
              )
            }
          >
            Save marks
          </Button>
          <Button variant="secondary" loading={submitting} onClick={() => void onSubmit()}>
            Submit and lock
          </Button>
        </div>
      ) : readOnly ? (
        <p className="text-sm text-muted-foreground">This subject is submitted or the exam is not open for editing.</p>
      ) : null}
    </div>
  );
}
