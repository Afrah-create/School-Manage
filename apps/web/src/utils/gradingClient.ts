import {
  DEFAULT_ASSESSMENT_GRADING_SCALES,
  resolveGradeFromScaleRows,
} from "@uganda-cbc-sms/shared";

export function computeUNEBGrade(score: number): { grade: string; points: number } {
  const fromDefaults = resolveGradeFromScaleRows(score, DEFAULT_ASSESSMENT_GRADING_SCALES.A_LEVEL);
  if (fromDefaults) return fromDefaults;
  if (score >= 80) return { grade: "A", points: 1 };
  if (score >= 75) return { grade: "B", points: 2 };
  if (score >= 65) return { grade: "C", points: 3 };
  if (score >= 60) return { grade: "D", points: 4 };
  if (score >= 55) return { grade: "E", points: 5 };
  if (score >= 45) return { grade: "O", points: 6 };
  return { grade: "F", points: 9 };
}

export function computeGradeFromConfiguredScale(
  score: number,
  rows: Array<{
    grade: string;
    minScore: number;
    maxScore: number;
    points: number;
    sortOrder?: number;
    isActive?: boolean;
  }>,
): { grade: string; points: number } {
  return resolveGradeFromScaleRows(score, rows) ?? computeUNEBGrade(score);
}
export function computeDivision(totalPoints: number): string {
  if (totalPoints <= 12) return "I";
  if (totalPoints <= 18) return "II";
  if (totalPoints <= 24) return "III";
  if (totalPoints <= 28) return "IV";
  return "Ungraded";
}
