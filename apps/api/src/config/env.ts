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

export function getAllowedOrigins(): string[] {
  return loadEnv()
    .ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
