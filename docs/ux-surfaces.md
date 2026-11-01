# ZamBus UX surfaces

ZamBus now ships **three distinct products** from one codebase. They share the API,
the design tokens (`frontend/src/styles.css`) and the UI primitives
(`frontend/src/components/ui.tsx`), but not the layout, the navigation or the tone.

| Surface | Route prefix | Shell | Who | Feel |
|---|---|---|---|---|
| Passenger storefront | `/`, `/search`, `/trips/:id`, `/my-trips` | `PassengerShell` | public → PASSENGER | marketing hero, top nav, wide cards, generous whitespace |
| Driver crew app | `/driver/*` | `DriverShell` | DRIVER | dark chrome, bottom tab bar, thumb-reachable, scan-first |
| Operator / admin console | `/app/*` | `Layout` (sidebar) | OPERATOR, ADMIN | dense sidebar, tables, stat tiles |

`Layout` redirects PASSENGER → `/my-trips` and DRIVER → `/driver`, and login routes each
role to its own home (`pages/auth.tsx → roleHome`).

## Passenger journey

Modelled on the Lux Express funnel in `docs/luxexpress-journey-teardown.md`, implemented
against the existing API (no new tables):

```
/                 hero search (From, To, date, passengers) + popular departures
/search           URL-driven results — shareable, back-button safe, date strip, sort
/trips/:id?pax=N  step 1  Seats        multi-select coach map, hold N seats
                  step 2  Review & pay passenger card, per-seat bookings, hold timer, mobile money
                  step 3  Ticket       QR per seat + links into My trips
/my-trips         upcoming / past tabs
/my-trips/:id     the QR ticket itself (unchanged payload: booking.qrCodeData)
```

Deliberate choices:

- **Browse before identity.** `/` and `/search` are public (`GET /api/trips` needs no token).
  Sign-in is only required when a seat is actually held — `RequireAuth` remembers the full
  path (including `?pax=`) and login returns you there.
- **URL is the state.** Origin, destination, date, passenger count and sort all live in the
  query string, so refresh, back and shared links behave.
- **Multi-seat = N bookings.** The API models one seat per booking, so holding N seats creates
  N `PENDING` bookings and payment confirms them in order. If any hold fails, the ones already
  taken are released so no orphaned holds linger.
- **The hold timer is real.** It counts down the backend seat-lock window (10 minutes,
  `seat_locks` / `CommissionSettings.seatLockDurationMinutes`). Expired holds are released by
  the server and disappear from the map.
- **QR codes are untouched.** The passenger ticket still renders `booking.qrCodeData` with
  `qrcode.react`, and the driver still validates it through `POST /api/boarding/scan`
  (`QrCameraScanner` + manual payload/ID entry), then marks boarded / dropped off.
- **The ticket leads with the QR.** It is the part that gets scanned, so it owns the top of the
  ticket at 360 px (68 vw on phones) with a 2-module quiet zone, and the trip/passenger/seat
  details stack underneath a perforation line. "Show full screen" opens a projector view
  (ESC or click to close) that fills the screen with the code — verified by feeding a
  screenshot of that view through the driver's upload-scan path (VALID).

## What is still open

The teardown's heavier items are intentionally not built yet: a server-side cart
(`carts` / `cart_items`), stop-level search, per-passenger documents, add-ons, real PSP
rail and the change/refund journey. This pass adopts the *journey shape* and the platform
split; the data model still records one booking per seat.
