import dotenv from "dotenv";
import path from "path";
import { assertSchoolDbRoleEnforcesRls } from "./config/dbRlsCheck.js";
import { loadEnv } from "./config/env.js";
import { createApp } from "./createApp.js";
import { startBillingScheduler } from "./modules/billing/billingScheduler.js";
import { verifyMailConfigAtStartup } from "./services/mail/verifyMailConfig.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), override: true });

const env = loadEnv();
const app = createApp();
const port = env.PORT;

void assertSchoolDbRoleEnforcesRls().then(async () => {
  await verifyMailConfigAtStartup();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
    if (env.NODE_ENV !== "test") {
      startBillingScheduler();
    }
  });
});
