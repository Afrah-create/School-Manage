"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type Student = { id: string; fullName: string; studentNumber: string };
type Strand = { id: string; name: string; competencies: string[] };

const COLORS: Record<string, string> = {
  A: "bg-green-100",
  B: "bg-blue-100",
  C: "bg-amber-100",
  D: "bg-red-100",
};

export function CbcAssessmentGrid({
  students,
  strands,
  onSave,
  onSubmit,
  disabled,
}: {
  students: Student[];
  strands: Strand[];
  onSave: (items: Array<{ studentId: string; strand: string; competency: string; rating: "A" | "B" | "C" | "D" }>) => Promise<void>;
  onSubmit: () => Promise<void>;
  disabled?: boolean;
}) {
  const [ratings, setRatings] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const key = (studentId: string, strand: string, competency: string) => `${studentId}::${strand}::${competency}`;
  const options = useMemo(
    () => [{ value: "", label: "—" }, { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" }],
    [],
  );

  const savePayload = async () => {
    const items: Array<{ studentId: string; strand: string; competency: string; rating: "A" | "B" | "C" | "D" }> = [];
    for (const student of students) {
      for (const strand of strands) {
        for (const competency of strand.competencies) {
          const rating = ratings[key(student.id, strand.name, competency)];
          if (!rating) continue;
          items.push({ studentId: student.id, strand: strand.name, competency, rating });
        }
      }
    }
    await onSave(items);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="px-2 py-2 text-left">Student</th>
              {strands.flatMap((s) => s.competencies.map((c) => `${s.name}: ${c}`)).map((h) => (
                <th key={h} className="px-2 py-2 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-border">
                <td className="px-2 py-2">
                  <div className="font-medium">{student.fullName}</div>
                  <div className="text-xs text-muted-foreground">{student.studentNumber}</div>
                </td>
                {strands.flatMap((s) => s.competencies.map((c) => ({ strand: s.name, competency: c }))).map((cell) => {
                  const k = key(student.id, cell.strand, cell.competency);
                  const value = ratings[k] ?? "";
                  return (
                    <td key={k} className={`px-2 py-2 ${value ? COLORS[value] : ""}`}>
                      <Select
                        options={options}
                        value={value}
                        disabled={disabled}
                        onChange={(e) => {
                          const next = e.target.value as "A" | "B" | "C" | "D" | "";
                          setRatings((prev) => {
                            const copy = { ...prev };
                            if (!next) delete copy[k];
                            else copy[k] = next;
                            return copy;
                          });
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => void savePayload()} disabled={disabled}>
          Save Progress
        </Button>
        <Button variant="secondary" onClick={() => void onSubmit()} disabled={disabled}>
          Submit & Lock
        </Button>
      </div>
    </div>
  );
}
