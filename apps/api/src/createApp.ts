import cors from "cors";
import compression from "compression";
import express, { type Express } from "express";
import path from "path";
import { loadEnv, getAllowedOrigins } from "./config/env.js";
import { anomalyDetectorMiddleware } from "./middleware/anomalyDetector.js";
import { cacheLayerMiddleware } from "./middleware/cacheLayer.js";
import { globalInputSanitiser } from "./middleware/inputSanitiser.js";
import { ipBlocklistMiddleware } from "./middleware/ipBlocklist.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.js";
import {
  globalRateLimiter,
  speedLimiter,
} from "./middleware/rateLimiter.js";
import {
  jsonParser,
  securityHeadersMiddleware,
  urlencodedParser,
} from "./middleware/securityHeaders.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { assessmentsRouter } from "./modules/assessments/assessments.routes.js";
import { examsRouter } from "./modules/exams/exams.routes.js";
import { attendanceRouter } from "./modules/attendance/attendance.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { academicRouter } from "./modules/academic/academic.routes.js";
import { feesRouter } from "./modules/fees/fees.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { studentsRouter } from "./modules/students/students.routes.js";
import { timetableRouter } from "./modules/timetable/timetable.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { securityRouter } from "./modules/security/security.routes.js";

export function createApp(): Express {
  const env = loadEnv();
  const app = express();
  const uploadRoot = env.UPLOAD_DIR;

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(ipBlocklistMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(
    cors({
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: [
        "X-Cache",
        "X-Cache-Age",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "Retry-After",
      ],
      maxAge: 86400,
    }),
  );
  app.use(compression({ level: 6, threshold: 1024 }));
  app.use(jsonParser);
  app.use(urlencodedParser);
  app.use(globalRateLimiter);
  app.use("/api", speedLimiter);
  app.use(requestLoggerMiddleware);
  app.use(anomalyDetectorMiddleware);
  app.use(globalInputSanitiser);
  app.use(cacheLayerMiddleware);

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
  app.use("/api/exams", examsRouter);
  app.use("/api/fees", feesRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/timetable", timetableRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/audit-logs", auditRouter);
  app.use("/api/security", securityRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: "Not found", code: "NOT_FOUND" });
  });

  app.use(errorHandler);

  return app;
}
