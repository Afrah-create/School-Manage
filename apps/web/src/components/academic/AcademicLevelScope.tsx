"use client";

import type { AcademicLevel } from "@/lib/academicLevel";
import { ACADEMIC_LEVELS, levelLabel } from "@/lib/academicLevel";

export function AcademicLevelScope({
  level,
  onLevelChange,
  description,
}: {
  level: AcademicLevel;
  onLevelChange: (level: AcademicLevel) => void;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      <div
        className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
        role="tablist"
        aria-label="School level"
      >
        {ACADEMIC_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={level === l}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-ui ${
              level === l
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onLevelChange(l)}
          >
            {levelLabel(l)}
          </button>
        ))}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
