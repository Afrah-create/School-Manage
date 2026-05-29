import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { platformPool } from "../src/config/db.js";
import { printPlatformAdminBanner, seedPlatformAdmin } from "./lib/seedPlatformAdmin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function main(): Promise<void> {
  const result = await seedPlatformAdmin();
  printPlatformAdminBanner(result);
  console.log(
    result.created
      ? `Created platform super-admin: ${result.email}`
      : `Updated platform super-admin: ${result.email}`,
  );
  await platformPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
