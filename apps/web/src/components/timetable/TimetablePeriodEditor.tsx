"use client";

import type { TimetablePeriod } from "@uganda-cbc-sms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type PeriodDraft = {
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isTeaching: boolean;
};

export function periodsToDraft(periods: TimetablePeriod[]): PeriodDraft[] {
  return periods.map((p) => ({
    periodNumber: p.periodNumber,
    label: p.label,
    startTime: p.startTime,
    endTime: p.endTime,
    isTeaching: p.isTeaching,
  }));
}

export function TimetablePeriodEditor({
  periods,
  onChange,
  disabled,
}: {
  periods: PeriodDraft[];
  onChange: (next: PeriodDraft[]) => void;
  disabled?: boolean;
}) {
  const update = (index: number, patch: Partial<PeriodDraft>) => {
    onChange(periods.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addPeriod = () => {
    const nextNum = periods.length ? Math.max(...periods.map((p) => p.periodNumber)) + 1 : 1;
    onChange([
      ...periods,
      {
        periodNumber: nextNum,
        label: `Period ${nextNum}`,
        startTime: "14:00",
        endTime: "14:40",
        isTeaching: true,
      },
    ]);
  };

  const remove = (index: number) => {
    onChange(
      periods
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, periodNumber: i + 1 })),
    );
  };

  return (
    <div className="space-y-3">
      {periods.map((p, index) => (
        <div
          key={`${p.periodNumber}-${index}`}
          className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-5"
        >
          <Input
            label="Label"
            value={p.label}
            disabled={disabled}
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <Input
            label="Start"
            type="time"
            value={p.startTime}
            disabled={disabled}
            onChange={(e) => update(index, { startTime: e.target.value })}
          />
          <Input
            label="End"
            type="time"
            value={p.endTime}
            disabled={disabled}
            onChange={(e) => update(index, { endTime: e.target.value })}
          />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={p.isTeaching}
              disabled={disabled}
              onChange={(e) => update(index, { isTeaching: e.target.checked })}
            />
            Teaching period
          </label>
          <div className="flex items-end">
            <Button type="button" variant="ghost" disabled={disabled} onClick={() => remove(index)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" disabled={disabled} onClick={addPeriod}>
        Add period
      </Button>
    </div>
  );
}
