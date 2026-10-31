# ZamBus API

Backend for **ZamBus — Smart Digital Intercity Bus Management System for Zambia**.

A modular monolith that supports the full journey: passenger registration → route search →
seat reservation → booking → simulated payment → QR ticket → boarding verification →
trip execution → reporting, plus the **GreenTrack** energy-efficiency and emissions module.

| | |
|---|---|
| Runtime | Node.js 20+ (developed on Node 24) |
| Framework | NestJS 11 (Express 5) |
| Database | PostgreSQL 17 via Prisma 6 |
| Auth | JWT access tokens + rotating refresh tokens, bcrypt hashing |
| Tests | Jest + Supertest |

---

## Status

| Stage | Scope | State |
|---|---|---|
| 0 | Scaffold, env validation, database schema, seed data, error envelope | ✅ Done |
| 1 | Auth: register, login, refresh, logout, password reset, profile, RBAC | ✅ Done |
| 2 | Operators, fleet, routes, schedules, trips, seat inventory | ⏳ Next |
| 3 | Booking engine, seat holds, payment simulation, tickets, QR | ⏳ Pending |
| 4 | Crew APIs: manifests, QR verification, boarding, incidents, trip status | ⏳ Pending |
| 5 | GreenTrack: fuel records, emission factors, calculations, reports | ⏳ Pending |
| 6 | Admin, audit views, notifications, feedback, docs polish | ⏳ Pending |

---

## Quick start

### 1. Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer, reachable from your machine

### 2. Install and configure

Local development note: if you keep an unmanaged PostgreSQL instance in
`%USERPROFILE%\.zambus` (as this machine does), start it with
`powershell -File scripts/dev-db.ps1 start` before running the API.

```bash
npm install
cp .env.example .env    # Windows PowerShell: Copy-Item .env.example .env
```

Open `.env` and set at minimum:

- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TICKET_QR_SECRET` — long random strings.
  Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

The API refuses to start if a required variable is missing or invalid
(`src/config/env.validation.ts` is the single source of truth).

### 3. Create the database

```bash
# from an existing postgres connection
psql -U postgres -c "CREATE DATABASE zambus;"

npm run prisma:migrate   # applies migrations
npm run seed             # roles, permissions, demo operator, trips, emission factors
```

### 4. Run

```bash
npm run start:dev        # watch mode
# or
npm run build && npm start
```

Health check: <http://localhost:3000/api/v1/health>

### Demo accounts (development only — seeded)

| Role | Email | Password |
|---|---|---|
| Passenger | `passenger@zambus.zm` | `Passenger123!` |
| Operator | `operator@zambus.zm` | `Operator123!` |
| Driver | `driver@zambus.zm` | `Driver123!` |
| Conductor | `conductor@zambus.zm` | `Conductor123!` |
| Administrator | `admin@zambus.zm` | `Admin123!` |

These exist **only** in seeded development databases. Never seed a production deployment
with them.

---

## Tests

```bash
npm test
```

Tests run against a separate database (`zambus_test` by default). The Jest global setup
creates it, applies migrations and seeds reference data automatically. Override the target
with `TEST_DATABASE_URL`.

Run a single suite:

```bash
npx jest tests/auth.spec.ts
```

---

## Project structure

```
prisma/
  schema.prisma          database schema (frozen contract v1)
  migrations/            SQL migrations, including constraints Prisma cannot express
  seed.ts                idempotent development seed
src/
  main.ts                bootstrap: helmet, CORS, validation, error envelope
  app.module.ts          module wiring, global guards, rate limiting
  config/                environment loading and validation
  prisma/                PrismaModule + PrismaService
  common/
    decorators/          @Public, @Roles, @CurrentUser
    errors/              ApiException (business-rule errors)
    filters/             GlobalExceptionFilter (error envelope, Prisma mapping)
    guards/              JwtAuthGuard, RolesGuard
    interceptors/        ResponseInterceptor (success envelope)
    types/               AuthUser, JWT payloads
    utils/               crypto, password hashing
  modules/
    auth/                authentication, tokens, profile endpoints
    audit/               audit logging service
    health/              health endpoint
docs/
  API_CONTRACT.md        endpoints, payloads, error codes
  DATABASE.md            schema and integrity rules
  GREENTRACK.md          calculation methodology and guard rails
```

---

## API conventions

- Base path: `/api/v1`
- Success: `{ "success": true, "data": { ... } }`
- Error: `{ "success": false, "error": { "code", "message", "details": [] } }`
- Authentication: `Authorization: Bearer <accessToken>`
- Money is stored and returned in **ngwee** (100 ngwee = 1 ZMW).
- Times are ISO-8601 UTC.

Full contract: [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

---

## Security notes

- Passwords hashed with bcrypt (cost 12); login timing is constant whether or not the
  account exists.
- Refresh tokens are stored hashed, rotated on every use, and reuse revokes the whole
  session family (theft detection).
- Every request revalidates the user against the database, so suspensions and role changes
  take effect immediately.
- Global rate limiting plus a stricter limiter on credential endpoints.
- `helmet` security headers, explicit CORS allow-list, `whitelist` + `forbidNonWhitelisted`
  request validation (privilege-escalation attempts such as `role: ADMIN` are rejected).
- Audit rows for registrations, logins, failed logins, password changes and resets.
- Secrets come from environment variables only; `.env` is git-ignored.

---

## Known prototype limitations

- **Payments are simulated.** No live mobile-money or card integration.
- **No email/SMS delivery.** `POST /auth/forgot-password` returns the reset token in the
  response body outside `NODE_ENV=production` so the frontend can complete the flow.
- **Email verification is not enforced**; new accounts are active immediately.
- **Single-seat hold model**: the hold lives on `TripSeat` + `Booking` rows and is released
  by a sweeper (Stage 3).
- **No file storage** for operator logos; `logoUrl` stores a URL only.
- **Reports are computed on request**; no scheduled nightly aggregation yet.
