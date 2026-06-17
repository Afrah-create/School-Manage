import {
  CBC_RATINGS,
  getCbcRatingScore,
  type CbcRating,
} from "../constants/cbcRatingBands";
import { DEFAULT_O_LEVEL_COMPULSORY_SUBJECT_CODES } from "../constants/defaultCurriculumCatalog";
import { resolveGradeFromScaleRows, type DefaultGradingScaleRow } from "../constants/assessmentGradingScales";

export type CaSource = "project_work" | "strand_fallback" | "incomplete";

export type CurriculumForm = "S1" | "S2" | "S3" | "S4";

export type CaYearWindow = "S1_S4" | "S3_S4" | "custom";

export type CaRulesMethod = "school_defined" | "rating_score_map" | "weighted_strand_average";

export type ProjectWorkAggregation = "mean_of_projects" | "mean_of_term_means";

export const OLEVEL_FORMULA_VERSION = "cbc_ca_v2";

export type AssessmentConfig = {
  caWeight: number;
  eocWeight: number;
  caYearWindow: CaYearWindow;
  caCustomForms: CurriculumForm[];
  allowIncompleteCaOverride: boolean;
  policyVerifiedAt: string | null;
  projectWork: {
    expectedPerTerm: number;
    policyVerifiedAt: string | null;
  };
  caRules: {
    method: CaRulesMethod;
    /** Provisional fallback only — used when no project_work_scores exist in the window. */
    fallbackRatingScoreMap: Record<CbcRating, number>;
    strandWeights?: Record<string, Record<string, number>>;
    aggregation: ProjectWorkAggregation;
  };
  minimumSubjects: number;
  qualifyingGradeMin: CbcRating;
  compulsorySubjectCodes: string[] | null;
};

export const DEFAULT_CA_RATING_SCORE_MAP: Record<CbcRating, number> = {
  A: 100,
  B: 80,
  C: 60,
  D: 40,
  E: 20,
};

export const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  caWeight: 0.2,
  eocWeight: 0.8,
  caYearWindow: "S1_S4",
  caCustomForms: ["S1", "S2", "S3", "S4"],
  allowIncompleteCaOverride: false,
  policyVerifiedAt: null,
  projectWork: {
    expectedPerTerm: 4,
    policyVerifiedAt: null,
  },
  caRules: {
    method: "rating_score_map",
    fallbackRatingScoreMap: { ...DEFAULT_CA_RATING_SCORE_MAP },
    aggregation: "mean_of_projects",
  },
  minimumSubjects: 8,
  qualifyingGradeMin: "D",
  compulsorySubjectCodes: null,
};

export type StrandRating = {
  strand: string;
  rating: string;
};

export type ProjectScoreRow = {
  score: number;
  maxScore: number;
  termId: string;
  projectNumber: number;
};

export type CaScoreResult = {
  score: number | null;
  source: CaSource;
  projectsCompleted: number;
  projectsExpected: number;
  complete: boolean;
};

export type OlevelSubjectResultInput = {
  subjectCode: string;
  caScore: number | null;
  eocScore: number | null;
  caComplete: boolean;
  caSource: CaSource | null;
  projectComplete: boolean;
  projectsCompleted: number;
  projectsExpected: number;
  finalGrade: CbcRating | null;
  compositeScore: number | null;
};

export type OlevelCertificationReason =
  | "missing_compulsory"
  | "subjects_lt_8"
  | "missing_ca"
  | "ca_provisional_fallback"
  | "ca_incomplete_projects"
  | "missing_project"
  | "all_grade_e"
  | "no_qualifying_grade";

export type OlevelCertificationResult = {
  resultCode: "RESULT_1" | "RESULT_2" | "RESULT_3";
  reasonCodes: OlevelCertificationReason[];
};

const QUALIFYING_GRADES: Record<CbcRating, CbcRating[]> = {
  A: ["A"],
  B: ["A", "B"],
  C: ["A", "B", "C"],
  D: ["A", "B", "C", "D"],
  E: ["A", "B", "C", "D", "E"],
};

const WINDOW_FORMS: Record<CaYearWindow, CurriculumForm[]> = {
  S1_S4: ["S1", "S2", "S3", "S4"],
  S3_S4: ["S3", "S4"],
  custom: [],
};

export function mergeAssessmentConfig(
  partial: Partial<AssessmentConfig> | null | undefined,
): AssessmentConfig {
  if (!partial || typeof partial !== "object") return { ...DEFAULT_ASSESSMENT_CONFIG };
  const legacyMap =
    (partial.caRules as { ratingScoreMap?: Record<CbcRating, number> } | undefined)?.ratingScoreMap;
  const fallbackMap = partial.caRules?.fallbackRatingScoreMap ?? legacyMap;
  return {
    caWeight: partial.caWeight ?? DEFAULT_ASSESSMENT_CONFIG.caWeight,
    eocWeight: partial.eocWeight ?? DEFAULT_ASSESSMENT_CONFIG.eocWeight,
    caYearWindow: partial.caYearWindow ?? DEFAULT_ASSESSMENT_CONFIG.caYearWindow,
    caCustomForms: partial.caCustomForms?.length
      ? partial.caCustomForms
      : DEFAULT_ASSESSMENT_CONFIG.caCustomForms,
    allowIncompleteCaOverride:
      partial.allowIncompleteCaOverride ?? DEFAULT_ASSESSMENT_CONFIG.allowIncompleteCaOverride,
    policyVerifiedAt: partial.policyVerifiedAt ?? DEFAULT_ASSESSMENT_CONFIG.policyVerifiedAt,
    projectWork: {
      expectedPerTerm:
        partial.projectWork?.expectedPerTerm ?? DEFAULT_ASSESSMENT_CONFIG.projectWork.expectedPerTerm,
      policyVerifiedAt:
        partial.projectWork?.policyVerifiedAt ??
        DEFAULT_ASSESSMENT_CONFIG.projectWork.policyVerifiedAt,
    },
    caRules: {
      method: partial.caRules?.method ?? DEFAULT_ASSESSMENT_CONFIG.caRules.method,
      fallbackRatingScoreMap: {
        ...DEFAULT_CA_RATING_SCORE_MAP,
        ...(fallbackMap ?? {}),
      },
      strandWeights: partial.caRules?.strandWeights,
      aggregation: partial.caRules?.aggregation ?? DEFAULT_ASSESSMENT_CONFIG.caRules.aggregation,
    },
    minimumSubjects: partial.minimumSubjects ?? DEFAULT_ASSESSMENT_CONFIG.minimumSubjects,
    qualifyingGradeMin: partial.qualifyingGradeMin ?? DEFAULT_ASSESSMENT_CONFIG.qualifyingGradeMin,
    compulsorySubjectCodes:
      partial.compulsorySubjectCodes === undefined
        ? DEFAULT_ASSESSMENT_CONFIG.compulsorySubjectCodes
        : partial.compulsorySubjectCodes,
  };
}

export function resolveCompulsorySubjectCodes(config: AssessmentConfig): string[] {
  return config.compulsorySubjectCodes ?? [...DEFAULT_O_LEVEL_COMPULSORY_SUBJECT_CODES];
}

export function resolveWindowForms(config: AssessmentConfig): CurriculumForm[] {
  if (config.caYearWindow === "custom") {
    return config.caCustomForms.length ? config.caCustomForms : ["S4"];
  }
  return WINDOW_FORMS[config.caYearWindow];
}

/** Count expected project slots in the CA window (terms × expected per term). */
export function computeProjectsExpected(
  config: AssessmentConfig,
  termCountInWindow: number,
): number {
  const perTerm = Math.max(1, config.projectWork.expectedPerTerm);
  return perTerm * Math.max(1, termCountInWindow);
}

function normalizeProjectPct(score: number, maxScore: number): number | null {
  const max = maxScore > 0 ? maxScore : 100;
  const pct = (score / max) * 100;
  if (Number.isNaN(pct)) return null;
  return Math.round(pct * 100) / 100;
}

function aggregateProjectScores(
  rows: ProjectScoreRow[],
  aggregation: ProjectWorkAggregation,
): number | null {
  if (rows.length === 0) return null;
  if (aggregation === "mean_of_term_means") {
    const byTerm = new Map<string, number[]>();
    for (const r of rows) {
      const pct = normalizeProjectPct(r.score, r.maxScore);
      if (pct == null) continue;
      const list = byTerm.get(r.termId) ?? [];
      list.push(pct);
      byTerm.set(r.termId, list);
    }
    const termMeans: number[] = [];
    for (const vals of byTerm.values()) {
      if (vals.length === 0) continue;
      termMeans.push(vals.reduce((s, v) => s + v, 0) / vals.length);
    }
    if (termMeans.length === 0) return null;
    const avg = termMeans.reduce((s, v) => s + v, 0) / termMeans.length;
    return Math.round(avg * 100) / 100;
  }
  const pcts: number[] = [];
  for (const r of rows) {
    const pct = normalizeProjectPct(r.score, r.maxScore);
    if (pct != null) pcts.push(pct);
  }
  if (pcts.length === 0) return null;
  const avg = pcts.reduce((s, v) => s + v, 0) / pcts.length;
  return Math.round(avg * 100) / 100;
}

/** Derive CA from strand ratings using the admin fallback map (provisional only). */
export function resolveCaFromStrandFallback(
  strandRatings: StrandRating[],
  config: AssessmentConfig,
  subjectCode?: string,
): { score: number | null; complete: boolean } {
  if (strandRatings.length === 0) return { score: null, complete: false };

  const map = config.caRules.fallbackRatingScoreMap;
  const method =
    config.caRules.method === "school_defined" ? "rating_score_map" : config.caRules.method;

  if (method === "weighted_strand_average" && subjectCode && config.caRules.strandWeights?.[subjectCode]) {
    const weights = config.caRules.strandWeights[subjectCode]!;
    let weightedSum = 0;
    let weightTotal = 0;
    for (const row of strandRatings) {
      const w = weights[row.strand] ?? 1;
      const rating = row.rating.trim().toUpperCase() as CbcRating;
      const pct = map[rating];
      if (pct == null) continue;
      weightedSum += pct * w;
      weightTotal += w;
    }
    if (weightTotal === 0) return { score: null, complete: false };
    return { score: Math.round((weightedSum / weightTotal) * 100) / 100, complete: true };
  }

  const values: number[] = [];
  for (const row of strandRatings) {
    const rating = row.rating.trim().toUpperCase() as CbcRating;
    const pct = map[rating];
    if (pct != null) values.push(pct);
  }
  if (values.length === 0) return { score: null, complete: false };
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return {
    score: Math.round(avg * 100) / 100,
    complete: values.length === strandRatings.length,
  };
}

/**
 * HYBRID CA resolver: project work is authoritative; strand ratings are provisional fallback only.
 */
export function ca_score_for(input: {
  projectScores: ProjectScoreRow[];
  strandRatings: StrandRating[];
  projectsExpected: number;
  config: AssessmentConfig;
  subjectCode?: string;
}): CaScoreResult {
  const { projectScores, strandRatings, projectsExpected, config, subjectCode } = input;
  const projectsCompleted = projectScores.length;
  const expected = Math.max(1, projectsExpected);

  if (projectScores.length > 0) {
    const score = aggregateProjectScores(projectScores, config.caRules.aggregation);
    const complete =
      projectsCompleted >= expected || Boolean(config.allowIncompleteCaOverride);
    if (!complete) {
      return {
        score: null,
        source: "incomplete",
        projectsCompleted,
        projectsExpected: expected,
        complete: false,
      };
    }
    return {
      score,
      source: "project_work",
      projectsCompleted,
      projectsExpected: expected,
      complete: true,
    };
  }

  if (strandRatings.length > 0) {
    const fallback = resolveCaFromStrandFallback(strandRatings, config, subjectCode);
    return {
      score: fallback.score,
      source: "strand_fallback",
      projectsCompleted: 0,
      projectsExpected: expected,
      complete: fallback.complete,
    };
  }

  return {
    score: null,
    source: "incomplete",
    projectsCompleted: 0,
    projectsExpected: expected,
    complete: false,
  };
}

/** @deprecated Use ca_score_for — strand-only CA is no longer authoritative. */
export function resolveCaScore(
  strandRatings: StrandRating[],
  config: AssessmentConfig,
  subjectCode?: string,
): { score: number | null; complete: boolean } {
  const result = ca_score_for({
    projectScores: [],
    strandRatings,
    projectsExpected: config.projectWork.expectedPerTerm,
    config,
    subjectCode,
  });
  return { score: result.score, complete: result.complete };
}

export function computeCompositeScore(
  caScore: number | null,
  eocScore: number | null,
  config: AssessmentConfig,
): number | null {
  if (caScore == null || eocScore == null) return null;
  const composite = config.caWeight * caScore + config.eocWeight * eocScore;
  return Math.round(composite * 100) / 100;
}

export function finalOLevelSubjectGrade(
  caScore: number | null,
  eocScore: number | null,
  bands: Array<Pick<DefaultGradingScaleRow, "grade" | "minScore" | "maxScore" | "sortOrder"> & { isActive?: boolean }>,
  config: AssessmentConfig = DEFAULT_ASSESSMENT_CONFIG,
): { finalGrade: CbcRating | null; compositeScore: number | null } {
  const compositeScore = computeCompositeScore(caScore, eocScore, config);
  if (compositeScore == null) return { finalGrade: null, compositeScore: null };
  const resolved = resolveGradeFromScaleRows(compositeScore, bands);
  const grade = resolved?.grade?.toUpperCase() as CbcRating | undefined;
  if (!grade || !CBC_RATINGS.includes(grade)) return { finalGrade: null, compositeScore };
  return { finalGrade: grade, compositeScore };
}

function isQualifyingGrade(grade: CbcRating, minGrade: CbcRating): boolean {
  return (QUALIFYING_GRADES[minGrade] ?? QUALIFYING_GRADES.D).includes(grade);
}

function hasValidOfficialCa(subject: OlevelSubjectResultInput): boolean {
  return (
    subject.caSource === "project_work" &&
    subject.projectsCompleted >= subject.projectsExpected &&
    subject.caComplete
  );
}

/** Compute UCE Result 1 / 2 / 3 from per-subject summaries. */
export function computeOlevelCertification(
  subjects: OlevelSubjectResultInput[],
  config: AssessmentConfig = DEFAULT_ASSESSMENT_CONFIG,
): OlevelCertificationResult {
  const compulsory = resolveCompulsorySubjectCodes(config);
  const sat = subjects.filter((s) => s.finalGrade != null);
  const reasons: OlevelCertificationReason[] = [];

  if (sat.length > 0 && sat.every((s) => s.finalGrade === "E")) {
    return { resultCode: "RESULT_3", reasonCodes: ["all_grade_e"] };
  }

  const compulsorySat = compulsory.filter((code) =>
    sat.some((s) => s.subjectCode.toUpperCase() === code.toUpperCase()),
  );
  if (compulsorySat.length < compulsory.length) {
    reasons.push("missing_compulsory");
  }

  if (sat.length < config.minimumSubjects) {
    reasons.push("subjects_lt_8");
  }

  const provisionalCa = sat.some((s) => s.caSource === "strand_fallback");
  if (provisionalCa) reasons.push("ca_provisional_fallback");

  const incompleteCa = sat.some(
    (s) => s.caSource === "incomplete" || !hasValidOfficialCa(s),
  );
  if (incompleteCa) {
    reasons.push("missing_ca");
    if (sat.some((s) => s.caSource === "incomplete")) {
      reasons.push("ca_incomplete_projects");
    }
  }

  const incompleteProject = sat.some((s) => !s.projectComplete);
  if (incompleteProject) reasons.push("missing_project");

  const hasQualifying = sat.some(
    (s) => s.finalGrade != null && isQualifyingGrade(s.finalGrade, config.qualifyingGradeMin),
  );
  if (!hasQualifying && sat.length > 0) {
    reasons.push("no_qualifying_grade");
  }

  if (reasons.length > 0) {
    return { resultCode: "RESULT_2", reasonCodes: [...new Set(reasons)] };
  }

  return { resultCode: "RESULT_1", reasonCodes: [] };
}

export const OLEVEL_CERTIFICATION_LABELS: Record<string, string> = {
  RESULT_1: "Result 1 — Certificate awarded",
  RESULT_2: "Result 2 — Does not qualify",
  RESULT_3: "Result 3 — All subjects at E",
};

export const OLEVEL_CERTIFICATION_REASON_LABELS: Record<OlevelCertificationReason, string> = {
  missing_compulsory: "One or more compulsory subjects not sat",
  subjects_lt_8: "Fewer than 8 subjects with final grades",
  missing_ca: "Continuous assessment incomplete or not from official project work",
  ca_provisional_fallback: "CA derived from strand ratings only (provisional — not official project work)",
  ca_incomplete_projects: "Required project work slots not complete",
  missing_project: "Project work incomplete for one or more subjects",
  all_grade_e: "Every sat subject at grade E",
  no_qualifying_grade: "No subject at D or better (D+)",
};

export const CA_SOURCE_LABELS: Record<CaSource, string> = {
  project_work: "Official (project work)",
  strand_fallback: "Provisional (strand estimate)",
  incomplete: "Incomplete",
};

// Re-export for consumers that used getCbcRatingScore via this module
export { getCbcRatingScore };
