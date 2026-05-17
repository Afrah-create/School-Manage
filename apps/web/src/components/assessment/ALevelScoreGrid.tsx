"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { computeGradeFromConfiguredScale, computeUNEBGrade } from "@/utils/gradingClient";
import type { GradingScaleRow } from "@/hooks/useGradingScales";

type Student = { id: string; fullName: string; studentNumber: string };

export function ALevelScoreGrid({
  students,
  gradingScaleRows,
  onSave,
  onSubmit,
}: {
  students: Student[];
  gradingScaleRows?: GradingScaleRow[];
  onSave: (items: Array<{ studentId: string; score: number }>) => Promise<void>;
  onSubmit: () => Promise<void>;
}) {
  const [scores, setScores] = useState<Record<string, string>>({});

  const parsed = useMemo(
    () =>
      students.map((s) => {
        const raw = scores[s.id];
        const score = raw === undefined || raw === "" ? null : Number(raw);
        const valid = score !== null && !Number.isNaN(score) && score >= 0 && score <= 100;
        const out =
          valid && score !== null
            ? gradingScaleRows?.length
              ? computeGradeFromConfiguredScale(score, gradingScaleRows)
              : computeUNEBGrade(score)
            : null;
        return { ...s, score, valid, out };
      }),
    [gradingScaleRows, scores, students],
  );

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-2 py-2 text-left">Student</th>
              <th className="px-2 py-2 text-left">Score</th>
              <th className="px-2 py-2 text-left">Grade</th>
              <th className="px-2 py-2 text-left">Points</th>
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
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={scores[row.id] ?? ""}
                    onChange={(e) => setScores((p) => ({ ...p, [row.id]: e.target.value }))}
                    error={scores[row.id] && !row.valid ? "0-100 only" : undefined}
                  />
                </td>
                <td className="px-2 py-2">{row.out?.grade ?? "-"}</td>
                <td className="px-2 py-2">{row.out?.points ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() =>
            void onSave(
              parsed
                .filter((p) => p.valid && p.score != null)
                .map((p) => ({ studentId: p.id, score: Number(p.score) })),
            )
          }
        >
          Save Progress
        </Button>
        <Button variant="secondary" onClick={() => void onSubmit()}>
          Submit & Lock
        </Button>
      </div>
    </div>
  );
}
