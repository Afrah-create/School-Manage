export type GradingScaleLevel = "O_LEVEL" | "A_LEVEL";

export type DefaultGradingScaleRow = {
  grade: string;
  minScore: number;
  maxScore: number;
  points: number;
  descriptor: string;
  sortOrder: number;
};

/** UNEB-style default scales used for migrations, seed scripts, and admin reset. */
export const DEFAULT_ASSESSMENT_GRADING_SCALES: Record<GradingScaleLevel, DefaultGradingScaleRow[]> = {
  A_LEVEL: [
    { grade: "A", minScore: 80, maxScore: 100, points: 1, descriptor: "Distinction", sortOrder: 1 },
    { grade: "B", minScore: 75, maxScore: 79.99, points: 2, descriptor: "Very Good", sortOrder: 2 },
    { grade: "C", minScore: 65, maxScore: 74.99, points: 3, descriptor: "Credit", sortOrder: 3 },
    { grade: "D", minScore: 60, maxScore: 64.99, points: 4, descriptor: "Pass", sortOrder: 4 },
    { grade: "E", minScore: 55, maxScore: 59.99, points: 5, descriptor: "Partial Pass", sortOrder: 5 },
    { grade: "O", minScore: 45, maxScore: 54.99, points: 6, descriptor: "Ordinary", sortOrder: 6 },
    { grade: "F", minScore: 0, maxScore: 44.99, points: 9, descriptor: "Fail", sortOrder: 7 },
  ],
  O_LEVEL: [
    { grade: "A", minScore: 80, maxScore: 100, points: 1, descriptor: "Excellent", sortOrder: 1 },
    { grade: "B", minScore: 75, maxScore: 79.99, points: 2, descriptor: "Very Good", sortOrder: 2 },
    { grade: "C", minScore: 65, maxScore: 74.99, points: 3, descriptor: "Good", sortOrder: 3 },
    { grade: "D", minScore: 60, maxScore: 64.99, points: 4, descriptor: "Satisfactory", sortOrder: 4 },
    { grade: "E", minScore: 55, maxScore: 59.99, points: 5, descriptor: "Pass", sortOrder: 5 },
    { grade: "O", minScore: 45, maxScore: 54.99, points: 6, descriptor: "Ordinary", sortOrder: 6 },
    { grade: "F", minScore: 0, maxScore: 44.99, points: 9, descriptor: "Fail", sortOrder: 7 },
  ],
};

export function validateGradingScaleRows(
  rows: Array<{ grade: string; minScore: number; maxScore: number; isActive?: boolean }>,
): string | null {
  if (!rows.length) return "Add at least one grade row.";

  const active = rows.filter((r) => r.isActive !== false);
  for (const row of active) {
    if (row.minScore > row.maxScore) {
      return `Grade ${row.grade}: minimum score cannot exceed maximum score.`;
    }
  }

  const sorted = [...active].sort((a, b) => a.minScore - b.minScore);
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (curr.minScore <= prev.maxScore) {
      return `Overlapping ranges between grade ${prev.grade} (${prev.minScore}–${prev.maxScore}) and ${curr.grade} (${curr.minScore}–${curr.maxScore}).`;
    }
  }

  return null;
}

export function resolveGradeFromScaleRows(
  score: number,
  rows: Array<{
    grade: string;
    minScore: number;
    maxScore: number;
    points: number;
    sortOrder?: number;
    isActive?: boolean;
  }>,
): { grade: string; points: number } | null {
  const match = rows
    .filter((r) => r.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    .find((r) => score >= r.minScore && score <= r.maxScore);
  return match ? { grade: match.grade, points: match.points } : null;
}
