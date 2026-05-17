import "dotenv/config";
import { pool } from "../src/config/db";
import { seedDefaultGradingScales } from "../src/modules/academic/gradingScaleMaintenance";

/**
 * Seeds or refreshes default O-Level and A-Level grading scales.
 *
 * Usage:
 *   npm run seed:grading-scales
 *   npm run seed:grading-scales -- --level=A_LEVEL
 *   npm run seed:grading-scales -- --reset
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const levelArg = args.find((a) => a.startsWith("--level="))?.split("=")[1];

  const levels =
    levelArg === "O_LEVEL" || levelArg === "A_LEVEL"
      ? ([levelArg] as const)
      : (["A_LEVEL", "O_LEVEL"] as const);

  const result = await seedDefaultGradingScales({
    levels: [...levels],
    reset,
  });

  console.log(
    `Grading scales seeded for ${result.levels.join(", ")} (${result.inserted} row operations, reset=${reset}).`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
