"use client";

import Link from "next/link";
import { Controller, type Control } from "react-hook-form";
import type { ExamPaperInput } from "@uganda-cbc-sms/shared";
import { Spinner } from "@/components/feedback/Spinner";
import type { ExamSubjectOption } from "@/components/exams/ExamSubjectCheckboxList";

type PapersControl = Control<{ papers: ExamPaperInput[] }>;

type Props = {
  control: PapersControl;
  name: "papers";
  options: ExamSubjectOption[];
  loading?: boolean;
  error?: string | null;
  ready?: boolean;
  fieldError?: string;
};

export function ExamPaperPicker({
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
        <p className="text-sm font-medium">Exam papers</p>
        {options.length > 0 ? (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-brand underline"
                  onClick={() =>
                    field.onChange(
                      options.map((s) => ({ subjectId: s.subjectId, isCompulsory: true })),
                    )
                  }
                >
                  Select all (compulsory)
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
      <p className="mb-2 text-xs text-muted-foreground">
        Compulsory papers: every student in the class sits the paper. Optional papers: choose which students
        sit them on the exam page before opening.
      </p>
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
          render={({ field }) => {
            const papers = (field.value ?? []) as ExamPaperInput[];
            const selectedIds = new Set(papers.map((p) => p.subjectId));

            const setPaper = (subjectId: string, patch: Partial<ExamPaperInput> & { onExam: boolean }) => {
              if (!patch.onExam) {
                field.onChange(papers.filter((p) => p.subjectId !== subjectId));
                return;
              }
              const existing = papers.find((p) => p.subjectId === subjectId);
              const next = papers.filter((p) => p.subjectId !== subjectId);
              next.push({
                subjectId,
                isCompulsory: patch.isCompulsory ?? existing?.isCompulsory ?? true,
              });
              next.sort((a, b) => {
                const ac = options.find((o) => o.subjectId === a.subjectId)?.subjectCode ?? "";
                const bc = options.find((o) => o.subjectId === b.subjectId)?.subjectCode ?? "";
                return ac.localeCompare(bc);
              });
              field.onChange(next);
            };

            return (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded border border-border p-3">
                {options.map((cs) => {
                  const onExam = selectedIds.has(cs.subjectId);
                  const paper = papers.find((p) => p.subjectId === cs.subjectId);
                  return (
                    <div
                      key={cs.subjectId}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md py-1 text-sm"
                    >
                      <label className="flex min-w-[12rem] cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border accent-brand"
                          checked={onExam}
                          onChange={(e) =>
                            setPaper(cs.subjectId, { onExam: e.target.checked, isCompulsory: true })
                          }
                        />
                        <span>
                          {cs.subjectCode} — {cs.subjectName}
                        </span>
                      </label>
                      {onExam ? (
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-border accent-brand"
                            checked={paper?.isCompulsory !== false}
                            onChange={(e) =>
                              setPaper(cs.subjectId, {
                                onExam: true,
                                isCompulsory: e.target.checked,
                              })
                            }
                          />
                          Compulsory for all students
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      )}
      {fieldError ? <p className="mt-1 text-xs text-red-600">{fieldError}</p> : null}
    </div>
  );
}
