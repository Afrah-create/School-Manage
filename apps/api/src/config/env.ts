import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readKeyFile(name: string): string | undefined {
  const p = path.join(__dirname, "../../.keys", name);
  if (!existsSync(p)) return undefined;
  return readFileSync(p, "utf8");
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_EXPIRY: z.string().default("8h"),
  BCRYPT_ROUNDS: z.coerce.number().min(10).default(10),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  REDIS_URL: z.string().optional(),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
  AUTO_BLOCK_THRESHOLD: z.coerce.number().default(500),
  REPORT_CACHE_DIR: z.string().default("./cache/reports"),
  REQUEST_LOG_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(1),
  UPLOAD_DIR: z.string().default("./uploads"),
  SESSION_INACTIVITY_MINUTES: z.coerce.number().min(1).max(480).default(15),
  APP_ROOT_DOMAIN: z.string().default("localhost"),
  DEFAULT_TENANT_SLUG: z.string().default("default"),
  BILLING_MOCK_PAYMENTS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET: z.string().optional(),
  WEB_APP_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function normalizePem(key: string): string {
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const jwtPrivate =
    process.env.JWT_PRIVATE_KEY ?? (nodeEnv === "development" ? readKeyFile("jwt-private.pem") : undefined);
  const jwtPublic =
    process.env.JWT_PUBLIC_KEY ?? (nodeEnv === "development" ? readKeyFile("jwt-public.pem") : undefined);

  const parsed = envSchema.safeParse({
    NODE_ENV: nodeEnv,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_PRIVATE_KEY: jwtPrivate,
    JWT_PUBLIC_KEY: jwtPublic,
    JWT_EXPIRY: process.env.JWT_EXPIRY ?? process.env.JWT_EXPIRES_IN,
    BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    REDIS_URL: process.env.REDIS_URL,
    MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS,
    AUTO_BLOCK_THRESHOLD: process.env.AUTO_BLOCK_THRESHOLD,
    REPORT_CACHE_DIR: process.env.REPORT_CACHE_DIR,
    REQUEST_LOG_SAMPLE_RATE: process.env.REQUEST_LOG_SAMPLE_RATE,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    SESSION_INACTIVITY_MINUTES: process.env.SESSION_INACTIVITY_MINUTES,
    APP_ROOT_DOMAIN: process.env.APP_ROOT_DOMAIN,
    DEFAULT_TENANT_SLUG: process.env.DEFAULT_TENANT_SLUG,
    BILLING_MOCK_PAYMENTS: process.env.BILLING_MOCK_PAYMENTS,
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_WEBHOOK_SECRET: process.env.FLUTTERWAVE_WEBHOOK_SECRET,
    WEB_APP_URL: process.env.WEB_APP_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });

  if (!parsed.success) {
    const missing = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }

  cached = {
    ...parsed.data,
    JWT_PRIVATE_KEY: normalizePem(parsed.data.JWT_PRIVATE_KEY),
    JWT_PUBLIC_KEY: normalizePem(parsed.data.JWT_PUBLIC_KEY),
  };
  return cached;
}

export function getAllowedOrigins():
  | string[]
  | ((origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void) {
  const env = loadEnv();
  const explicit = env.ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const root = env.APP_ROOT_DOMAIN;

  return (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (explicit.includes(origin)) {
      cb(null, true);
      return;
    }
    try {
      const host = new URL(origin).hostname.toLowerCase();
      if (host === "localhost" || host.endsWith(".localhost")) {
        cb(null, true);
        return;
      }
      if (root && root !== "localhost" && (host === root || host.endsWith(`.${root}`))) {
        cb(null, true);
        return;
      }
    } catch {
      /* ignore */
    }
    cb(null, false);
  };
}
