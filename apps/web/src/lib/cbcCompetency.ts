import {
  COMPETENCY_LEVEL_LABELS,
  COMPETENCY_LEVELS,
  type CompetencyLevel,
} from "@uganda-cbc-sms/shared";
import {
  assessmentActivityTypeSchema,
  competencyLevelSchema,
} from "@uganda-cbc-sms/shared/schemas/assessment.schema";

export type { CompetencyLevel };
export type AssessmentActivityType = ReturnType<typeof assessmentActivityTypeSchema.parse>;

export { COMPETENCY_LEVELS, competencyLevelSchema, assessmentActivityTypeSchema };

export const COMPETENCY_LEVEL_UI: Record<
  CompetencyLevel,
  { label: string; badge: string; select: string }
> = {
  exceeds_expectations: {
    label: COMPETENCY_LEVEL_LABELS.exceeds_expectations,
    badge: "bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-200",
    select: "bg-green-50 dark:bg-green-950/30",
  },
  meets_expectations: {
    label: COMPETENCY_LEVEL_LABELS.meets_expectations,
    badge: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
    select: "bg-blue-50 dark:bg-blue-950/30",
  },
  approaching_expectations: {
    label: COMPETENCY_LEVEL_LABELS.approaching_expectations,
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    select: "bg-amber-50 dark:bg-amber-950/30",
  },
  below_expectations: {
    label: COMPETENCY_LEVEL_LABELS.below_expectations,
    badge: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200",
    select: "bg-red-50 dark:bg-red-950/30",
  },
};

export const COMPETENCY_LEVEL_SELECT_OPTIONS = [
  { value: "", label: "—" },
  ...COMPETENCY_LEVELS.map((level) => ({
    value: level,
    label: COMPETENCY_LEVEL_UI[level].label,
  })),
];

export const ACTIVITY_TYPE_LABELS: Record<AssessmentActivityType, string> = {
  assignment: "Assignment",
  project: "Project",
  group_work: "Group work",
  practical: "Practical",
  participation: "Participation",
  presentation: "Presentation",
  test: "Test",
};

export const ACTIVITY_TYPE_OPTIONS = (
  Object.entries(ACTIVITY_TYPE_LABELS) as [AssessmentActivityType, string][]
).map(([value, label]) => ({ value, label }));

export type AssessmentActivity = {
  id: string;
  subject_id: string;
  class_id: string;
  term_id: string;
  academic_year_id: string;
  teacher_id: string;
  activity_type: AssessmentActivityType;
  title: string;
  activity_date: string;
  is_locked: boolean;
  locked_at: string | null;
  created_at: string;
};

export type TermCompetencySummaryRow = {
  id: string;
  student_id: string;
  subject_id: string;
  competency_id: string;
  term_id: string;
  aggregated_level: CompetencyLevel;
  aggregation_method: string;
  is_teacher_override: boolean;
  overridden_level: CompetencyLevel | null;
  override_justification: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  created_at: string;
  updated_at: string;
  competency_name?: string;
  effective_level: CompetencyLevel;
};

export type NormalizedCompetency = {
  id: string;
  name: string;
  strandId: string;
};

const ACTIVITY_STORAGE_KEY = "cbc-assessment-activities-v1";

export function activityContextKey(
  classId: string,
  subjectId: string,
  termId: string,
  academicYearId: string,
) {
  return `${classId}:${subjectId}:${termId}:${academicYearId}`;
}

export function loadStoredActivities(contextKey: string): AssessmentActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as AssessmentActivity[];
    return all.filter((a) => activityContextKey(a.class_id, a.subject_id, a.term_id, a.academic_year_id) === contextKey);
  } catch {
    return [];
  }
}

export function storeActivity(activity: AssessmentActivity) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as AssessmentActivity[]) : [];
    const next = [activity, ...all.filter((a) => a.id !== activity.id)];
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}

export function patchStoredActivity(id: string, patch: Partial<AssessmentActivity>) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as AssessmentActivity[];
    localStorage.setItem(
      ACTIVITY_STORAGE_KEY,
      JSON.stringify(all.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    );
  } catch {
    /* ignore */
  }
}

/** Lossy legacy letter shim (dual-write): A→exceeds … D→below. E is not mapped. */
export function legacyLetterToCompetencyLevel(letter: string): CompetencyLevel | null {
  const map: Record<string, CompetencyLevel> = {
    A: "exceeds_expectations",
    B: "meets_expectations",
    C: "approaching_expectations",
    D: "below_expectations",
  };
  return map[letter.trim().toUpperCase()] ?? null;
}

/** Map competency_level from API rows (snake or camel), with legacy letter fallback. */
export function pickCompetencyLevel(row: Record<string, unknown>): CompetencyLevel | null {
  const raw = row["competency_level"] ?? row["competencyLevel"] ?? row["effective_level"] ?? row["effectiveLevel"];
  if (typeof raw === "string") {
    const parsed = competencyLevelSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }
  const rating = row["rating"];
  if (typeof rating === "string") {
    return legacyLetterToCompetencyLevel(rating);
  }
  return null;
}

export function mapCbcRatingsError(status: number | undefined): string {
  if (status === 400) {
    return "This activity is locked — you cannot save further competency ratings for it. Activity lock is separate from legacy strand-sheet unlock (headteacher only on the old submission flow).";
  }
  if (status === 403) {
    return "You are not assigned to this class and subject, or you did not create this activity.";
  }
  return "We could not save competency ratings. Check your connection and try again.";
}

export function normalizeCompetencyName(name: string) {
  return name.trim().toLowerCase();
}
