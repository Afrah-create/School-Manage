"use client";

import type { AcademicYear, SchoolClass, Term } from "@uganda-cbc-sms/shared";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type Tab = "active" | "archived";

export function AdminExamsFilters({
  tab,
  onTabChange,
  years,
  yearId,
  onYearChange,
  terms,
  termId,
  onTermChange,
  classes,
  classId,
  onClassChange,
  statusFilter,
  onStatusChange,
  showCreate,
  onCreate,
}: {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  years: AcademicYear[];
  yearId: string;
  onYearChange: (id: string) => void;
  terms: Term[];
  termId: string;
  onTermChange: (id: string) => void;
  classes: SchoolClass[];
  classId: string;
  onClassChange: (id: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  showCreate?: boolean;
  onCreate?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
          role="tablist"
          aria-label="Exam list view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "active"}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-ui ${
              tab === "active"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTabChange("active")}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "archived"}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-ui ${
              tab === "archived"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTabChange("archived")}
          >
            Archived
          </button>
        </div>
        {showCreate && onCreate ? (
          <Button type="button" onClick={onCreate}>
            Create exam
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Academic year"
          options={years.map((y) => ({ value: y.id, label: y.name }))}
          value={yearId}
          onChange={(e) => onYearChange(e.target.value)}
        />
        <Select
          label="Term"
          options={
            terms.length
              ? [{ value: "", label: "All terms" }, ...terms.map((t) => ({ value: t.id, label: `Term ${t.termNumber}` }))]
              : [{ value: "", label: "Select a year first" }]
          }
          value={termId}
          onChange={(e) => onTermChange(e.target.value)}
        />
        <Select
          label="Class"
          options={[
            { value: "", label: "All classes" },
            ...classes.map((c) => ({
              value: c.id,
              label: `${c.name}${c.stream ? ` · ${c.stream}` : ""}`,
            })),
          ]}
          value={classId}
          onChange={(e) => onClassChange(e.target.value)}
        />
        {tab === "active" ? (
          <Select
            label="Status"
            options={[
              { value: "", label: "All statuses" },
              { value: "draft", label: "Draft" },
              { value: "open", label: "Open (marking)" },
              { value: "closed", label: "Closed" },
            ]}
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
          />
        ) : (
          <div className="flex flex-col justify-end">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <p className="mt-2 text-sm text-muted-foreground">Archived exams only</p>
          </div>
        )}
      </div>
    </div>
  );
}
