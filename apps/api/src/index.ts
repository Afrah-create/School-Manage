import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { errorHandler } from "./middleware/errorHandler";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { assessmentsRouter } from "./modules/assessments/assessments.routes";
import { attendanceRouter } from "./modules/attendance/attendance.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { academicRouter } from "./modules/academic/academic.routes";
import { feesRouter } from "./modules/fees/fees.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { studentsRouter } from "./modules/students/students.routes";
import { usersRouter } from "./modules/users/users.routes";

// Load API-local env first, then workspace root env as fallback.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const app = express();
const uploadRoot = process.env.UPLOAD_DIR ?? "./uploads";

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.use("/uploads", express.static(path.resolve(process.cwd(), uploadRoot)));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/academic", academicRouter);
app.use("/api/students", studentsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/assessments", assessmentsRouter);
app.use("/api/fees", feesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/analytics", analyticsRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

app.use(errorHandler);

const port = Number(process.env.PORT ?? 5000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
