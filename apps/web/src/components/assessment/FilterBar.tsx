"use client";

import { Select } from "@/components/ui/Select";

type Option = { value: string; label: string };

export function FilterBar({
  years,
  terms,
  classes,
  subjects,
  combinations,
  value,
  onChange,
  includeCombination,
}: {
  years: Option[];
  terms: Option[];
  classes: Option[];
  subjects: Option[];
  combinations?: Option[];
  includeCombination?: boolean;
  value: {
    yearId: string;
    termId: string;
    classId: string;
    subjectId: string;
    combinationId?: string;
  };
  onChange: (next: Partial<{ yearId: string; termId: string; classId: string; subjectId: string; combinationId: string }>) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      <Select label="Academic year" options={years} value={value.yearId} onChange={(e) => onChange({ yearId: e.target.value })} />
      <Select label="Term" options={terms} value={value.termId} onChange={(e) => onChange({ termId: e.target.value })} />
      <Select label="Class" options={classes} value={value.classId} onChange={(e) => onChange({ classId: e.target.value })} />
      {includeCombination ? (
        <Select
          label="Combination"
          options={combinations ?? [{ value: "", label: "All combinations" }]}
          value={value.combinationId ?? ""}
          onChange={(e) => onChange({ combinationId: e.target.value })}
        />
      ) : null}
      <Select label="Subject" options={subjects} value={value.subjectId} onChange={(e) => onChange({ subjectId: e.target.value })} />
    </div>
  );
}
