"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function CBCProjectAssessment({
  studentId,
  subjectId,
  termId,
  yearId,
  onSave,
}: {
  studentId: string;
  subjectId: string;
  termId: string;
  yearId: string;
  onSave: (payload: {
    studentId: string;
    subjectId: string;
    termId: string;
    yearId: string;
    assessmentTitle: string;
    score: number;
    maxScore: number;
  }) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  return (
    <div className="space-y-3">
      <Input label="Assessment title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Score" type="number" value={score} onChange={(e) => setScore(e.target.value)} />
        <Input label="Max score" type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
      </div>
      <Button
        onClick={() =>
          void onSave({
            studentId,
            subjectId,
            termId,
            yearId,
            assessmentTitle: title,
            score: Number(score),
            maxScore: Number(maxScore),
          })
        }
      >
        Add project score
      </Button>
    </div>
  );
}
