import "dotenv/config";
import { pool } from "../src/config/db";
import { recalculateOlevelGrades } from "../src/utils/olevelSubjectGrade";

/**
 * Recomputes O-Level CA + EOC composites and certification from project work and exam marks.
 *
 * Usage:
 *   npm run recalculate:olevel-grades
 *   npm run recalculate:olevel-grades -- --yearId=<uuid> --classId=<uuid> --studentId=<uuid>
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const academicYearId = args.find((a) => a.startsWith("--yearId="))?.split("=")[1];
  const classId = args.find((a) => a.startsWith("--classId="))?.split("=")[1];
  const studentId = args.find((a) => a.startsWith("--studentId="))?.split("=")[1];

  const result = await recalculateOlevelGrades({ academicYearId, classId, studentId });

  console.log(
    `Recalculated O-Level results for ${result.scanned} student(s); ${result.updated} subject row(s) updated.`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
