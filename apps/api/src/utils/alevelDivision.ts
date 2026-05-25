import { computeDivision } from "./grading";

/**
 * UNEB A-Level aggregate: sum of points from the three best subjects
 * (lowest point values = best grades).
 */
export function computeAlevelAggregate(pointValues: number[]): {
  totalPoints: number;
  division: string;
  subjectsUsed: number;
} {
  const pts = pointValues.filter((p) => typeof p === "number" && !Number.isNaN(p)).sort((a, b) => a - b);
  const best3 = pts.slice(0, 3);
  const totalPoints = best3.reduce((sum, p) => sum + p, 0);
  const division =
    best3.length < 3 ? "Incomplete" : computeDivision(totalPoints);
  return { totalPoints, division, subjectsUsed: best3.length };
}
