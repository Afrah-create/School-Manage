"use client";

import Link from "next/link";
import { Controller, type Control } from "react-hook-form";
import { Spinner } from "@/components/feedback/Spinner";

export type ExamSubjectOption = {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
};

type SubjectIdsControl = Control<{ subjectIds: string[] }>;

type Props = {
  control: SubjectIdsControl;
  name: "subjectIds";
  options: ExamSubjectOption[];
  loading?: boolean;
  error?: string | null;
  ready?: boolean;
  fieldError?: string;
};

export function ExamSubjectCheckboxList({
  control,
  name,
  options,
  loading,
  error,
  ready = true,
  fieldError,
}: Props) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Subjects on this exam</p>
        {options.length > 0 ? (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-brand underline"
                  onClick={() => field.onChange(options.map((s) => s.subjectId))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-muted-foreground underline"
                  onClick={() => field.onChange([])}
                >
                  Clear
                </button>
              </div>
            )}
          />
        ) : null}
      </div>
      {!ready ? (
        <p className="text-sm text-muted-foreground">
          Select an academic year and class to load subjects assigned to that class.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Loading subjects…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No subjects are assigned to this class for the selected year.{" "}
          <Link href="/admin/academic/class-subjects" className="text-brand underline">
            Assign subjects in Academic → Class subjects
          </Link>
          , then return here.
        </p>
      ) : (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-border p-3">
              {options.map((cs) => {
                const current = (field.value ?? []) as string[];
                const checked = current.includes(cs.subjectId);
                return (
                  <label key={cs.subjectId} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-brand"
                      checked={checked}
                      onChange={() => {
                        field.onChange(
                          checked
                            ? current.filter((id) => id !== cs.subjectId)
                            : [...current, cs.subjectId],
                        );
                      }}
                    />
                    <span>
                      {cs.subjectCode} — {cs.subjectName}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        />
      )}
      {fieldError ? <p className="mt-1 text-xs text-red-600">{fieldError}</p> : null}
    </div>
  );
}
