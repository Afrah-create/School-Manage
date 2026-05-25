# Uganda CBC School Management System

Web-based school management for Ugandan secondary schools: **O-Level CBC (S1–S4)**, **A-Level UNEB (S5–S6)**, students, fees, attendance, and **role-based** dashboards.

## Monorepo layout

| Path | Description |
|------|-------------|
| `apps/web` | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| `apps/api` | Express.js REST API, TypeScript, `pg`, JWT, Multer, PDFKit |
| `packages/shared` | Shared Zod schemas, types, constants |

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_API_URL, ADMIN_* for seed
```

### Database

```bash
npm run migrate
npm run seed
```

### Development

```bash
npm run dev
```

- API: `http://localhost:5000` (see `PORT` in `.env`)
- App: `http://localhost:3000`
- API base for the browser: `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`)

## Scripts (root)

| Script | Description |
|--------|-------------|
| `npm run dev` | `concurrently` — API + web |
| `npm run dev:api` | API only |
| `npm run dev:web` | Web only |
| `npm run build` | Build all workspaces that define `build` |
| `npm run migrate` | Run SQL migrations (`apps/api`) |
| `npm run seed` | Create initial admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) |

## Authentication

1. `POST /api/auth/login` with `{ "email", "password" }`
2. Response: `{ "success": true, "data": { "token": "<JWT>", "user": { ... } } }`
3. Send `Authorization: Bearer <token>` on all protected routes.

## Roles

| Role | Typical access |
|------|----------------|
| `admin` | Users, academic structure, **grading scales**, students, fees setup, all assessments |
| `headteacher` | Students oversight, assessments, reports, analytics, approve report cards |
| `class_teacher` | Own class students, assessments, **attendance** |
| `subject_teacher` | CBC & A-Level assessment entry |
| `bursar` | Fees, invoices, payments, financial reports |

Sidebar navigation in the app is **role-aware** (Zustand `authStore`).

## API route map (summary)

- **Auth:** `POST /auth/login`, `POST /auth/logout`, `PATCH /auth/change-password`
- **Users:** `POST|GET /users`, `PATCH /users/:id/deactivate`, `PATCH /users/:id/reset-password`, `GET /users/me`
- **Academic:** `/academic/years|terms|classes|subjects|combinations`, `/academic/cbc-strands`, `/academic/class-subjects`, `/academic/grading-scales`
- **Students:** `POST|GET /students`, `GET /students/:id`, `POST /students/:id/photo`, `POST /students/promote`, `PATCH /students/:id/withdraw`, `GET /students/search`
- **Attendance:** `POST|GET /attendance`
- **CBC:** `POST|GET /assessments/cbc`, `PATCH /assessments/cbc/:id/submit`, `PATCH /assessments/cbc/:id/unlock` (headteacher)
- **A-Level:** `POST|GET /assessments/alevel`
- **Fees:** `/fees/structure`, `/fees/invoices`, `/fees/payments`, `/fees/balance/:studentId`, `/fees/reports`
- **Reports:** `POST /reports/cbc/generate`, `POST /reports/alevel/generate`, `PATCH /reports/:id/approve`, `GET /reports/:id/pdf`
- **Analytics:** `GET /analytics/dashboard`, `GET /analytics/class-performance`, `GET /analytics/report-pipeline`, `GET /analytics/reports-overview`

All JSON responses use `{ success, data?, error? }`. Password hashes are never returned.

## Quality tooling

- **ESLint** — `apps/web` uses `eslint-config-next` (`npm run lint` in web)
- **Prettier** — root `.prettierrc`

## License

Proprietary — SlimCyberTech / client use.
