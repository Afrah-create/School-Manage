import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { platformPool } from "../src/config/db.js";
import { markOverdueBillingPeriods } from "../src/modules/billing/billing.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function main(): Promise<void> {
  const updated = await markOverdueBillingPeriods();
  console.log(`Marked ${updated} billing period(s) as overdue.`);
  await platformPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
