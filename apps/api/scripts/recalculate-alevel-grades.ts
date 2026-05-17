import "dotenv/config";
import { pool } from "../src/config/db";
import { recalculateAlevelGrades } from "../src/modules/academic/gradingScaleMaintenance";

/**
 * Recomputes grade, points, and division summaries for stored A-Level scores
 * using the active admin-defined grading scale.
 *
 * Usage:
 *   npm run recalculate:alevel-grades
 *   npm run recalculate:alevel-grades -- --termId=<uuid> --yearId=<uuid>
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const termId = args.find((a) => a.startsWith("--termId="))?.split("=")[1];
  const yearId = args.find((a) => a.startsWith("--yearId="))?.split("=")[1];
  const studentId = args.find((a) => a.startsWith("--studentId="))?.split("=")[1];

  const result = await recalculateAlevelGrades({ termId, yearId, studentId });

  console.log(
    `Recalculated ${result.updatedScores} score row(s) and ${result.updatedDivisions} division summary row(s) (scanned ${result.scanned}).`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
