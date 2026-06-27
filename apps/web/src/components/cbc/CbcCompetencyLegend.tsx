import { COMPETENCY_LEVELS, COMPETENCY_LEVEL_UI } from "@/lib/cbcCompetency";
import { CompetencyLevelBadge } from "@/components/cbc/CompetencyLevelBadge";

/** Compact NCDC descriptor key for oversight screens. */
export function CbcCompetencyLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {COMPETENCY_LEVELS.map((level) => (
        <CompetencyLevelBadge key={level} level={level} size="sm" />
      ))}
    </div>
  );
}

export function CbcCompetencyLegendNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Levels follow the NCDC four-point descriptor scale.{" "}
      {COMPETENCY_LEVELS.map((l, i) => (
        <span key={l}>
          {i > 0 ? " · " : ""}
          <span className="font-medium text-foreground">{COMPETENCY_LEVEL_UI[l].label}</span>
        </span>
      ))}
    </p>
  );
}
