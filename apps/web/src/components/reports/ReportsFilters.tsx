"use client";

import { Select } from "@/components/ui/Select";

export type ReportsFilterOption = { value: string; label: string };

export type ReportsFiltersValue = {
  yearId: string;
  termId: string;
  classId: string;
  track: "cbc" | "alevel" | "all";
};

type Props = {
  years: ReportsFilterOption[];
  terms: ReportsFilterOption[];
  classes: ReportsFilterOption[];
  value: ReportsFiltersValue;
  onChange: (next: Partial<ReportsFiltersValue>) => void;
};

export function ReportsFilters({ years, terms, classes, value, onChange }: Props) {
  const yearOpts = years.length ? years : [{ value: "", label: "No years configured" }];
  const termOpts = terms.length ? terms : [{ value: "", label: "Select academic year first" }];
  const classOpts = classes.length ? classes : [{ value: "", label: "No classes for this year" }];

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Report context</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Academic year"
          options={yearOpts}
          value={value.yearId}
          onChange={(e) => onChange({ yearId: e.target.value, termId: "", classId: "" })}
        />
        <Select label="Term" options={termOpts} value={value.termId} onChange={(e) => onChange({ termId: e.target.value })} />
        <Select label="Class" options={classOpts} value={value.classId} onChange={(e) => onChange({ classId: e.target.value })} />
        <Select
          label="Track focus"
          options={[
            { value: "all", label: "CBC & A-Level" },
            { value: "cbc", label: "CBC only" },
            { value: "alevel", label: "A-Level only" },
          ]}
          value={value.track}
          onChange={(e) => onChange({ track: e.target.value as ReportsFiltersValue["track"] })}
        />
      </div>
    </div>
  );
}
