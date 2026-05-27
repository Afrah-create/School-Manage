"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TimetableClassSubjectOption,
  TimetableGridView,
  TimetableSlotOccupancyView,
} from "@uganda-cbc-sms/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { classDisplayName } from "@/lib/academicLevel";
import {
  countDraftConflicts,
  getAssignmentConflict,
  slotKey,
} from "@/lib/timetableSlotValidation";

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

type CellDraft = {
  dayOfWeek: number;
  periodId: string;
  classSubjectId: string;
};

export function TimetableClassGrid({
  grid,
  slotOptions,
  slotOccupancy,
  editable,
  saving,
  onSave,
}: {
  grid: TimetableGridView;
  slotOptions: TimetableClassSubjectOption[];
  slotOccupancy?: TimetableSlotOccupancyView;
  editable: boolean;
  saving?: boolean;
  onSave: (entries: CellDraft[]) => Promise<void>;
}) {
  const schoolDays = useMemo(() => grid.days.filter((d) => d.isSchoolDay), [grid.days]);
  const teachingPeriods = useMemo(() => grid.periods.filter((p) => p.isTeaching), [grid.periods]);

  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const cell of grid.cells) {
      if (cell.classSubjectId) {
        next[slotKey(cell.dayOfWeek, cell.periodId)] = cell.classSubjectId;
      }
    }
    setDraft(next);
  }, [grid]);

  const conflictCount = useMemo(
    () => countDraftConflicts(draft, slotOptions, slotOccupancy, grid.periods),
    [draft, slotOptions, slotOccupancy, grid.periods],
  );

  const buildOptionsForCell = (cellKeyValue: string, currentValue: string) => {
    const items: Array<{ value: string; label: string; disabled?: boolean }> = [
      { value: "", label: "— Free —" },
    ];

    for (const s of slotOptions) {
      const conflict = getAssignmentConflict(
        cellKeyValue,
        s.classSubjectId,
        draft,
        slotOptions,
        slotOccupancy,
        grid.periods,
      );
      const isCurrent = s.classSubjectId === currentValue;
      const blocked = Boolean(conflict) && !isCurrent;

      let label = `${s.subjectCode} · ${s.teacherName ?? "Unassigned"}`;
      if (blocked && conflict) {
        const short =
          conflict.length > 72 ? `${conflict.slice(0, 69)}…` : conflict;
        label = `${label} — ${short}`;
      }

      items.push({
        value: s.classSubjectId,
        label,
        disabled: blocked,
      });
    }

    return items;
  };

  const save = async () => {
    if (conflictCount > 0) return;
    const entries: CellDraft[] = [];
    for (const day of schoolDays) {
      for (const period of teachingPeriods) {
        const key = slotKey(day.dayOfWeek, period.id);
        const classSubjectId = draft[key];
        if (classSubjectId) {
          entries.push({ dayOfWeek: day.dayOfWeek, periodId: period.id, classSubjectId });
        }
      }
    }
    await onSave(entries);
  };

  return (
    <div className="space-y-4">
      {editable ? (
        <p className="text-xs text-muted-foreground">
          Options marked in the list are unavailable because the teacher is already booked in that
          period in another class. Fix highlighted cells before saving.
        </p>
      ) : null}

      {conflictCount > 0 ? (
        <Alert tone="info">
          {conflictCount} slot{conflictCount === 1 ? "" : "s"} still clash with another class or need a
          subject teacher. Adjust those cells before saving.
        </Alert>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Period</th>
              {schoolDays.map((d) => (
                <th key={d.dayOfWeek} className="min-w-[160px] px-3 py-2 text-left font-semibold text-muted-foreground">
                  {DAY_LABELS[d.dayOfWeek] ?? d.dayOfWeek}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {grid.periods.map((period) => {
              if (!period.isTeaching) {
                return (
                  <tr key={period.id} className="bg-muted/30">
                    <td colSpan={schoolDays.length + 1} className="px-3 py-2 text-center text-xs text-muted-foreground">
                      {period.label} · {period.startTime}–{period.endTime}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={period.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">{period.label}</div>
                    <div>
                      {period.startTime}–{period.endTime}
                    </div>
                  </td>
                  {schoolDays.map((day) => {
                    const key = slotKey(day.dayOfWeek, period.id);
                    const value = draft[key] ?? "";
                    const selected = slotOptions.find((s) => s.classSubjectId === value);
                    const cellConflict =
                      value && editable
                        ? getAssignmentConflict(
                            key,
                            value,
                            draft,
                            slotOptions,
                            slotOccupancy,
                            grid.periods,
                          )
                        : null;

                    const otherClasses = (slotOccupancy?.bySlot[key] ?? []).filter(
                      (o) => o.classSubjectId !== value,
                    );

                    return (
                      <td key={key} className="px-2 py-2 align-top">
                        {editable ? (
                          <div className="space-y-1">
                            {otherClasses.length > 0 ? (
                              <p className="text-[10px] leading-tight text-muted-foreground">
                                {otherClasses
                                  .map(
                                    (o) =>
                                      `${classDisplayName({ name: o.className, stream: o.classStream })} (${o.subjectCode})`,
                                  )
                                  .join(" · ")}
                              </p>
                            ) : null}
                            <Select
                              options={buildOptionsForCell(key, value)}
                              value={value}
                              error={cellConflict ?? undefined}
                              onChange={(e) =>
                                setDraft((prev) => {
                                  const next = { ...prev };
                                  if (e.target.value) next[key] = e.target.value;
                                  else delete next[key];
                                  return next;
                                })
                              }
                            />
                          </div>
                        ) : selected ? (
                          <div className="rounded-md border border-border bg-muted/30 px-2 py-1">
                            <div className="font-medium text-foreground">{selected.subjectCode}</div>
                            <div className="text-xs text-muted-foreground">{selected.subjectName}</div>
                            <div className="text-xs text-muted-foreground">{selected.teacherName}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Free</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editable ? (
        <div className="flex justify-end">
          <Button
            type="button"
            loading={saving}
            disabled={conflictCount > 0}
            onClick={() => void save()}
          >
            Save class timetable
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function TimetableTeacherGrid({ grid }: { grid: TimetableGridView }) {
  const schoolDays = useMemo(() => grid.days.filter((d) => d.isSchoolDay), [grid.days]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Period</th>
            {schoolDays.map((d) => (
              <th key={d.dayOfWeek} className="min-w-[140px] px-3 py-2 text-left font-semibold text-muted-foreground">
                {DAY_LABELS[d.dayOfWeek] ?? d.dayOfWeek}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {grid.periods.map((period) => {
            if (!period.isTeaching) {
              return (
                <tr key={period.id} className="bg-muted/30">
                  <td colSpan={schoolDays.length + 1} className="px-3 py-2 text-center text-xs text-muted-foreground">
                    {period.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={period.id}>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  <div className="font-medium">{period.label}</div>
                  <div className="text-muted-foreground">
                    {period.startTime}–{period.endTime}
                  </div>
                </td>
                {schoolDays.map((day) => {
                  const cell = grid.cells.find(
                    (c) => c.dayOfWeek === day.dayOfWeek && c.periodId === period.id,
                  );
                  return (
                    <td key={`${day.dayOfWeek}-${period.id}`} className="px-2 py-2 align-top">
                      {cell?.classSubjectId ? (
                        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
                          <div className="font-medium">
                            {classDisplayName({
                              name: cell.className ?? "",
                              stream: cell.classStream ?? "",
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">{cell.subjectCode}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Free</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
