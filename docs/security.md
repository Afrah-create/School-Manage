# API security deployment guide

This document covers Phase 1 security hardening for the Express API (`apps/api`).

## Environment variables

Copy `.env.example` and set:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | Yes (prod) | RS256 PEM keys; run `npm run generate:jwt-keys -w @uganda-cbc-sms/api` |
| `JWT_EXPIRY` | No | Default `8h` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS origins (e.g. `https://app.school.ug`) |
| `REDIS_URL` | No | Rate limits + JWT blacklist use in-memory fallback if unset |
| `MAX_LOGIN_ATTEMPTS` | No | Default `5` → 30 min lockout, HTTP 423 |
| `AUTO_BLOCK_THRESHOLD` | No | Default `500` requests / 5 min per IP → 24h block |
| `REQUEST_LOG_SAMPLE_RATE` | No | `0`–`1`, default `1` (full logging) |
| `BCRYPT_ROUNDS` | No | Minimum `10` |

Development: place keys in `apps/api/.keys/jwt-private.pem` and `jwt-public.pem` (auto-loaded when env vars are omitted).

## JWT RS256 cutover

1. Generate keys: `tsx apps/api/scripts/generate-jwt-keys.ts`
2. Set `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in production env (multiline PEM or `\n`-escaped).
3. Remove legacy `JWT_SECRET` — HS256 tokens are invalid after deploy.
4. Schedule a maintenance window: all users must sign in again.

## Redis (optional)

When `REDIS_URL` is set:

- Distributed rate limiting (`rate-limit-redis`)
- JWT `jti` blacklist on logout

If Redis is down, the API logs a warning once and uses in-memory stores; session revocation via `auth_sessions` still applies.

## Migrations

Run after deploy:

```bash
npm run migrate -w @uganda-cbc-sms/api
```

Security-related migrations:

- `042_security_lockout_and_tables.sql` — `login_attempts`, `ip_blocklist`, `security_audit_log`
- `043_api_request_log_and_indexes.sql` — partitioned `api_request_log`, performance indexes

## Middleware order

`createApp()` applies: IP blocklist → security headers → CORS → compression → JSON (50kb) → global rate limit → slowdown → request logger → anomaly detector → input sanitiser → cache layer → routes → error handler.

`app.set("trust proxy", 1)` is enabled for correct client IP behind Nginx.

## Nginx

See [`deploy/nginx.conf`](../deploy/nginx.conf) for reference `limit_req`, body size, and proxy settings. Terminate TLS at Nginx or a load balancer; forward `X-Forwarded-For` to Express.

## Admin security endpoints

`POST /api/security/block-ip`, `GET /api/security/audit-log`, `GET /api/security/metrics/api-usage` — admin role only.

## School-hours expectations

- Rate limits are tuned for typical school-day traffic (300 req / 15 min global per IP).
- Report and fee POST endpoints have stricter per-route limits.
- During peak registration or report generation, monitor `security_audit_log` and `api_request_log`.

## Testing

```bash
npm run test -w @uganda-cbc-sms/api
```

Set `DATABASE_URL_TEST` for integration tests if you extend the suite beyond unit tests.
