import { Router, type Express } from "express";
import cors from "cors";
import compression from "compression";
import express from "express";
import path from "path";
import { loadEnv, getAllowedOrigins } from "./config/env.js";
import { anomalyDetectorMiddleware } from "./middleware/anomalyDetector.js";
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
import { onboardingRouter } from "./modules/onboarding/onboarding.routes.js";
import { platformRouter } from "./modules/platform/platform.routes.js";
import { billingRouter, requireActiveSubscription } from "./modules/billing/billing.routes.js";
import { requireAuth } from "./middleware/jwtGuard.js";
import { requestDbMiddleware } from "./middleware/requestDb.js";
import { resolveTenant } from "./middleware/resolveTenant.js";

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
      allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Slug"],
      exposedHeaders: [
        "X-Cache",
        "X-Cache-Age",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "Retry-After",
        "X-Session-Idle-Expires-At",
        "X-Session-Inactivity-Minutes",
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
  app.use("/uploads", express.static(path.resolve(process.cwd(), uploadRoot)));

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/platform", platformRouter);
  app.use("/api", resolveTenant);
  app.use("/api", requestDbMiddleware);

  app.use("/api/auth", authRouter);
  app.use("/api/billing", billingRouter);

  const protectedSchoolApi = Router();
  protectedSchoolApi.use(requireAuth);
  protectedSchoolApi.use(requireActiveSubscription);
  protectedSchoolApi.use("/users", usersRouter);
  protectedSchoolApi.use("/academic", academicRouter);
  protectedSchoolApi.use("/students", studentsRouter);
  protectedSchoolApi.use("/attendance", attendanceRouter);
  protectedSchoolApi.use("/assessments", assessmentsRouter);
  protectedSchoolApi.use("/exams", examsRouter);
  protectedSchoolApi.use("/fees", feesRouter);
  protectedSchoolApi.use("/reports", reportsRouter);
  protectedSchoolApi.use("/settings", settingsRouter);
  protectedSchoolApi.use("/onboarding", onboardingRouter);
  protectedSchoolApi.use("/timetable", timetableRouter);
  protectedSchoolApi.use("/analytics", analyticsRouter);
  protectedSchoolApi.use("/audit-logs", auditRouter);
  protectedSchoolApi.use("/security", securityRouter);
  app.use("/api", protectedSchoolApi);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: "Not found", code: "NOT_FOUND" });
  });

  app.use(errorHandler);

  return app;
}
