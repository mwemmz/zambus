# ZamBus React Console

A React + TypeScript + Vite frontend for exercising the ZamBus backend end to end. It is a testing console, not the production UI: every screen maps to real API calls against the local Express server.

## Prerequisites

- Backend running on `http://localhost:3000`
- Database seeded (`cd ../backend && npm run seed`)
- Node.js 18+

## Run

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

The Vite dev server proxies `/api` to `http://localhost:3000`, so no CORS configuration is needed. To point at another backend, set `VITE_API_URL` before starting:

```bash
VITE_API_URL=http://localhost:3000/api npm run dev
```

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Passenger | `passenger@zambus.com` | `passenger123` |
| Driver | `driver@zambus.com` | `driver123` |
| Operator | `operator@zambus.com` | `operator123` |
| Admin | `admin@zambus.com` | `admin123` |

The login page has one-click buttons that fill these credentials.

## What you can test

### Passenger
- Search trips by origin, destination, date and price order
- View route/bus details and the live seat map
- Reserve a seat (creates a `PENDING` booking)
- Confirm the mock payment (writes the final QR ticket payload)
- View the QR code and copy the raw payload for driver scanning
- List and cancel bookings

### Driver
- View assigned trips
- Open the passenger manifest and mark passengers boarded/dropped off
- Validate a QR payload or a raw booking ID
- Duplicate, wrong-date and wrong-trip checks are enforced by the backend
- Report breakdowns, accidents and severe delays; see recent reports

### Operator
- View/register the bus company
- Register buses, change maintenance status, delete buses
- Create and delete routes
- Schedule trips for approved buses/routes/drivers
- Open, close, delay or cancel trips
- Export manifests as PDF/Excel
- View company revenue and commission analytics

### Admin
- Approve/reject pending companies, buses and routes
- Change user roles
- Edit platform settings (commission, currency, seat-lock duration)
- View platform analytics and emergency reports

### API tester
- Call any endpoint with the current session token attached
- Quick-call shortcuts for common endpoints
- Inspect the unwrapped JSON response

## Notes

- Payment is still the backend mock: `POST /bookings/:id/confirm` flips the status. This is the integration point for Lenco later.
- The driver scan endpoint only accepts tickets for **today's** travel. Seed trips depart tomorrow, so scanning them correctly returns `WRONG_DATE`; create a trip for today to test a `VALID` scan.
- Manifest PDF/Excel downloads require an `OPERATOR` or `ADMIN` session.
- Some backend routes are intentionally loose for testing (for example, any authenticated user can hit `POST /bookings`).

## Build

```bash
npm run build
npm run preview
```

## Structure

```
src/
  api.ts / apiExplorer.tsx     API client and request console
  auth/AuthContext.tsx         session persistence and role helpers
  components/                  layout, guards, shared UI
  lib/                         types, fetch hook, formatting
  pages/
    auth.tsx                   login and registration
    dashboard.tsx              role-aware dashboards
    passenger.tsx              search, seat selection, bookings, ticket
    driver.tsx                 trips, scan, emergency
    manifest.tsx               shared passenger manifest
    operator.tsx               company, fleet, routes, trips
    admin.tsx                  approvals, users, settings, reports
    analytics.tsx              shared revenue/commission view
```
