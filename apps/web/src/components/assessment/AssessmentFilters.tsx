"use client";

import type { ReactNode } from "react";
import { Select } from "@/components/ui/Select";

export type AssessmentFilterOption = { value: string; label: string };

export type AssessmentFiltersValue = {
  yearId: string;
  termId: string;
  classId: string;
  subjectId: string;
  combinationId?: string;
};

type Props = {
  years: AssessmentFilterOption[];
  terms: AssessmentFilterOption[];
  classes: AssessmentFilterOption[];
  subjects: AssessmentFilterOption[];
  combinations?: AssessmentFilterOption[];
  includeCombination?: boolean;
  value: AssessmentFiltersValue;
  onChange: (next: Partial<AssessmentFiltersValue>) => void;
  summary?: ReactNode;
  helperText?: ReactNode;
  /** CBC: subjects come from class assignment — hides empty catalogue noise */
  subjectHelper?: string | null;
};

export function AssessmentFilters({
  years,
  terms,
  classes,
  subjects,
  combinations,
  value,
  onChange,
  summary,
  helperText,
  subjectHelper,
  includeCombination,
}: Props) {
  const yearOpts = years.length ? years : [{ value: "", label: "No years configured" }];
  const termOpts = terms.length ? terms : [{ value: "", label: "No terms for this year" }];
  const classOpts = classes.length ? classes : [{ value: "", label: "No classes for this year" }];
  const subjectOpts = subjects.length ? subjects : [{ value: "", label: includeCombination ? "Pick combination first" : "Assign subjects to this class" }];
  const comboOpts = combinations?.length ? combinations : [{ value: "", label: "No combinations" }];

  return (
    <div className="space-y-4">
      {summary ? <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">{summary}</div> : null}
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessment period</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Academic year"
            options={yearOpts}
            value={value.yearId}
            onChange={(e) => onChange({ yearId: e.target.value })}
          />
          <Select label="Term" options={termOpts} value={value.termId} onChange={(e) => onChange({ termId: e.target.value })} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Class {includeCombination ? "and combination" : ""}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Class" options={classOpts} value={value.classId} onChange={(e) => onChange({ classId: e.target.value })} />
          {includeCombination ? (
            <Select
              label="Subject combination"
              options={comboOpts}
              value={value.combinationId ?? ""}
              onChange={(e) => onChange({ combinationId: e.target.value })}
            />
          ) : (
            <div />
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
        <Select
          label="Subject"
          options={subjectOpts}
          value={value.subjectId}
          onChange={(e) => onChange({ subjectId: e.target.value })}
        />
        {subjectHelper ? <p className="mt-1 text-xs text-muted-foreground">{subjectHelper}</p> : null}
      </div>
    </div>
  );
}
