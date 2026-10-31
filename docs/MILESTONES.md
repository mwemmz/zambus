# Development milestones

Updated: 2026-10-31

## Completed

### Stage 0 — Foundation
- NestJS 11 project, TypeScript strict mode, build pipeline.
- Environment validation (`src/config/env.validation.ts`) — the app refuses to boot with
  missing or weak secrets.
- Prisma schema for all 23 entity groups, initial migration plus an SQL migration for
  constraints Prisma cannot express.
- Idempotent seed: 18 permissions, 5 roles, demo operator + fleet + routes + schedules,
  42 trips with seat inventories, documented emission factors.
- Global success/error envelopes, Prisma error mapping, helmet, CORS allow-list.
- Rate limiting (global + stricter on credential endpoints).
- Audit logging service.

### Stage 1 — Authentication and authorisation
- Register, login, refresh (with rotation + reuse detection), logout.
- Password reset (single-use, expiring, revokes sessions).
- Profile read/update, change password.
- JWT access guard that reloads the user each request (immediate suspension/role changes).
- Role guard with `@Roles()` and `@Public()`.
- 15 integration tests covering registration, login, enumeration resistance, suspension,
  token rotation and theft detection, password reset, password change and profile updates.

## In progress

Nothing — Stage 2 is the next unit of work.

## Pending

| Stage | Scope | Depends on |
|---|---|---|
| 2 | Operators, buses, routes, schedules, trips, seat inventory | Stage 1 |
| 3 | Booking engine, seat holds + expiry sweeper, payment simulation, tickets, QR | Stage 2 |
| 4 | Crew APIs: assigned trips, manifest, QR verification, boarding, incidents | Stage 3 |
| 5 | GreenTrack: fuel records, calculator, reports, tests | Stage 2 |
| 6 | Admin, notifications, feedback, audit views, docs polish | Stage 1–5 |

## Blocked / coordination

| Item | Owner | Note |
|---|---|---|
| Frontend mock alignment | Dev 2 | Auth contract final in `docs/API_CONTRACT.md`; search/booking shapes are fixed but unimplemented |
| Scanner payload handling | Dev 3 | Send the raw scanned string to `POST /crew/tickets/verify`; do not parse client-side |
| Schema changes | All | Schema v1 is frozen; request changes before altering shared tables |
