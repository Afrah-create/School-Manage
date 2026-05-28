import dotenv from "dotenv";
import path from "path";
import { loadEnv } from "./config/env.js";
import { createApp } from "./createApp.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const env = loadEnv();
const app = createApp();
const port = env.PORT;

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
