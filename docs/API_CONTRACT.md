# ZamBus API contract

Base URL: `/api/v1`
Auth header: `Authorization: Bearer <accessToken>`

- ✅ implemented
- ⏳ planned (contract fixed, implementation pending)

## Response envelopes

Success:

```json
{ "success": true, "data": { } }
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "SEAT_UNAVAILABLE",
    "message": "Seat 12 is no longer available.",
    "details": [{ "field": "seatNumbers", "issue": "occupied" }]
  }
}
```

## Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid body or query fields |
| 400 | `INVALID_CREDENTIALS` | Wrong current password |
| 400 | `INVALID_RESET_TOKEN` | Password reset token invalid, used or expired |
| 401 | `UNAUTHENTICATED` | Missing, malformed or expired access token |
| 403 | `FORBIDDEN` | Authenticated but lacking the role/permission |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `ACCOUNT_EXISTS` | Email or phone already registered |
| 409 | `DUPLICATE_RESOURCE` | Generic unique-constraint conflict |
| 409 | `CONCURRENT_MODIFICATION` | Retryable write conflict |
| 409 | `SEAT_UNAVAILABLE` | One or more requested seats are taken/held |
| 409 | `ALREADY_PAID` | Booking already has a successful payment |
| 409 | `ALREADY_BOARDED` | Ticket already accepted for boarding |
| 410 | `HOLD_EXPIRED` | Seat hold expired; seats released |
| 410 | `TICKET_CANCELLED` | Ticket belongs to a cancelled booking |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

Validation errors return every failing field in `details`.

---

# Auth ✅

## POST /auth/register

Public. Creates a passenger account.

```json
{ "email": "thandiwe@example.com", "password": "Passw0rd123", "fullName": "Thandiwe Zulu", "phone": "0971234567" }
```

`201`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm...",
      "email": "thandiwe@example.com",
      "phone": "0971234567",
      "fullName": "Thandiwe Zulu",
      "status": "ACTIVE",
      "roles": ["PASSENGER"],
      "operatorId": null,
      "operatorName": null,
      "staffRole": null,
      "profile": { "nationalId": null, "dateOfBirth": null, "emergencyContactName": null, "emergencyContactPhone": null },
      "createdAt": "2026-10-31T05:25:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "refreshExpiresAt": "2026-11-07T05:25:00.000Z"
    }
  }
}
```

Errors: `409 ACCOUNT_EXISTS`, `400 VALIDATION_ERROR`.

Password policy: minimum 8 characters, at most 72, must contain a letter and a number.

## POST /auth/login

Public.

```json
{ "email": "passenger@zambus.zm", "password": "Passenger123!" }
```

`200` → same `{ user, tokens }` shape as register.

Errors: `401 UNAUTHENTICATED` (deliberately identical for unknown email and wrong password),
`403 FORBIDDEN` (suspended account), `429 RATE_LIMITED`.

## POST /auth/refresh

Public. Rotates the refresh token.

```json
{ "refreshToken": "eyJ..." }
```

`200` → `{ user, tokens }` with a **new** refresh token.

Errors: `401 UNAUTHENTICATED`. Replaying a rotated token revokes every session for that user.

## POST /auth/logout

Authenticated.

```json
{ "refreshToken": "eyJ..." }
```

`200` → `{ "message": "You have been logged out." }`

## POST /auth/forgot-password

Public. Always returns the same message to prevent account enumeration.

```json
{ "email": "passenger@zambus.zm" }
```

`200`:

```json
{
  "success": true,
  "data": {
    "message": "If that email address is registered, a password reset link has been sent.",
    "resetToken": "<dev only>",
    "expiresInMinutes": 30
  }
}
```

`resetToken` is **only** present when `NODE_ENV !== production` (prototype limitation).
The frontend should deep-link to `{FRONTEND_URL}/reset-password?token=...`.

## POST /auth/reset-password

Public. Single-use token, 30-minute default expiry.

```json
{ "token": "<resetToken>", "password": "NewPassw0rd123" }
```

`200` → `{ "message": "Your password has been reset. Please log in with the new password." }`

Errors: `400 INVALID_RESET_TOKEN`, `403 FORBIDDEN` (suspended).

## GET /me

Authenticated.

`200` → `{ "user": PublicUser }` (same object as in the auth responses).

## PATCH /me

Authenticated. All fields optional; unknown fields are rejected.

```json
{
  "fullName": "Thandiwe Zulu",
  "phone": "0971234567",
  "nationalId": "123456/78/9",
  "dateOfBirth": "1998-04-12",
  "emergencyContactName": "Mary Zulu",
  "emergencyContactPhone": "0977000111"
}
```

`200` → `{ "user": PublicUser }`

## PATCH /me/password

Authenticated.

```json
{ "currentPassword": "Passw0rd123", "password": "NewPassw0rd123", "refreshToken": "optional-current-refresh-token" }
```

`200` → `{ "message": "Your password has been changed." }`

When `refreshToken` is supplied that session stays logged in and all others are revoked;
otherwise every session is revoked.

Errors: `400 INVALID_CREDENTIALS`.

---

# Public discovery ⏳ (Stage 2)

| Method | Path | Description |
|---|---|---|
| GET | `/public/routes?origin=&destination=` | Distinct route summaries with min fare |
| GET | `/public/trips?origin=&destination=&date=&operatorId=` | Available trips with seats left |
| GET | `/public/trips/:tripId` | Trip detail, bus, operator, fare |
| GET | `/public/trips/:tripId/seats` | Seat map with `AVAILABLE` / `HELD` / `BOOKED` |
| GET | `/public/operators/:operatorId` | Public operator profile |

# Passenger bookings ⏳ (Stage 3)

| Method | Path | Description |
|---|---|---|
| POST | `/passenger/bookings` | Reserve seats, returns hold + `holdExpiresAt` |
| GET | `/passenger/bookings` | Booking history (paginated) |
| GET | `/passenger/bookings/:bookingId` | Booking detail with seats/payment/tickets |
| POST | `/passenger/bookings/:bookingId/pay` | Simulated payment |
| POST | `/passenger/bookings/:bookingId/cancel` | Cancel eligible booking |
| GET | `/passenger/tickets` | All tickets |
| GET | `/passenger/tickets/:ticketNumber` | Ticket detail incl. `qrPayload` |

## POST /passenger/bookings (contract)

```json
{
  "tripId": "cm...",
  "seats": [
    { "seatNumber": "12A", "passengerName": "Thandiwe Zulu", "passengerIdNumber": "123456/78/9" }
  ]
}
```

`201`:

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "cm...",
      "reference": "ZB-7K4M9Q",
      "status": "PENDING_PAYMENT",
      "totalNgwee": 32000,
      "holdExpiresAt": "2026-10-31T05:30:00.000Z",
      "seats": ["12A"]
    }
  }
}
```

Errors: `409 SEAT_UNAVAILABLE`, `410 HOLD_EXPIRED`, `422 TRIP_NOT_BOOKABLE`,
`422 TOO_MANY_SEATS`.

## POST /passenger/bookings/:bookingId/pay (contract)

```json
{ "method": "MTN_MOMO", "simulate": "SUCCESS" }
```

`simulate` is `SUCCESS` or `FAILURE`, used to exercise both paths in the demo.

`200`:

```json
{
  "success": true,
  "data": {
    "payment": {
      "transactionRef": "SIM-9F2K1M",
      "status": "SUCCESS",
      "amountNgwee": 32000,
      "paidAt": "2026-10-31T05:27:12.000Z"
    },
    "booking": { "id": "cm...", "status": "CONFIRMED" },
    "tickets": [{ "ticketNumber": "TKT-...", "seatNumber": "12A", "status": "VALID" }]
  }
}
```

Errors: `409 ALREADY_PAID`, `410 HOLD_EXPIRED`, `422 BOOKING_NOT_PAYABLE`.

# Crew / driver-conductor ⏳ (Stage 4)

| Method | Path | Description |
|---|---|---|
| GET | `/crew/trips` | Trips assigned to the signed-in driver/conductor |
| GET | `/crew/trips/:tripId` | Trip detail with crew and counters |
| GET | `/crew/trips/:tripId/manifest` | Passenger manifest for the trip |
| POST | `/crew/tickets/verify` | Validate a scanned QR payload |
| PATCH | `/crew/trips/:tripId/status` | Start, delay, arrive, complete |
| POST | `/crew/trips/:tripId/incidents` | Report delay/breakdown/accident |

## POST /crew/tickets/verify (contract — driver/conductor app)

```json
{ "tripId": "cm...", "qrPayload": "<raw scanned string>", "deviceInfo": "Android 14 / Camera" }
```

The scanner must send the scanned string **unchanged**. The QR contains only a ticket
number and a signed token; no passenger name or ID number.

`200` (always HTTP 200 for a completed verification; the result is in the body):

```json
{
  "success": true,
  "data": {
    "result": "ACCEPTED",
    "ticketNumber": "TKT-7K4M9Q",
    "seatNumber": "12A",
    "passengerName": "Thandiwe Zulu",
    "verifiedAt": "2026-10-31T06:10:00.000Z"
  }
}
```

Rejected example:

```json
{
  "success": true,
  "data": {
    "result": "REJECTED",
    "reason": "ALREADY_USED",
    "message": "This ticket was already used for boarding at 06:02.",
    "ticketNumber": "TKT-7K4M9Q"
  }
}
```

Rejection reasons: `INVALID_SIGNATURE`, `TICKET_NOT_FOUND`, `CANCELLED`, `ALREADY_USED`,
`WRONG_TRIP`, `NOT_YET_VALID`, `TRIP_NOT_BOARDING`.

# Operator ⏳ (Stage 2)

| Method | Path | Description |
|---|---|---|
| POST | `/operator/profile` | Register a company profile |
| GET | `/operator/profile` | Own company profile |
| PATCH | `/operator/profile` | Update company details |
| GET/POST | `/operator/buses` | List / create buses |
| PATCH | `/operator/buses/:busId` | Update bus or status |
| GET/POST | `/operator/routes` | List / create routes |
| PATCH | `/operator/routes/:routeId` | Update route |
| GET/POST | `/operator/schedules` | List / create schedules |
| GET/POST | `/operator/trips` | List / publish trips |
| PATCH | `/operator/trips/:tripId/status` | Delay, cancel, complete |
| GET | `/operator/trips/:tripId/manifest` | Passenger manifest |
| GET | `/operator/bookings` | Bookings and revenue |
| GET | `/operator/stats/occupancy` | Occupancy statistics |
| POST | `/operator/trips/:tripId/fuel` | Submit fuel record (GreenTrack) |

Contract detail is added as each module lands.

# GreenTrack ⏳ (Stage 5)

| Method | Path | Description |
|---|---|---|
| GET | `/greentrack/trips/:tripId` | Per-trip fuel, efficiency, CO₂ |
| GET | `/greentrack/buses/:busId?from=&to=` | Per-bus aggregates |
| GET | `/greentrack/routes/:routeId?from=&to=` | Per-route aggregates |
| GET | `/greentrack/operator/summary?from=&to=` | Operator efficiency report |
| GET | `/admin/greentrack/factors` | Emission factors and sources |

Every GreenTrack response carries:

```json
{
  "methodologyVersion": "1.0.0",
  "isEstimate": true,
  "dataStatus": "COMPLETE",
  "interpretation": "Estimated direct combustion emissions. Not a verified emission reduction."
}
```

See [GREENTRACK.md](GREENTRACK.md).

# Admin ⏳ (Stage 6)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/operators?status=PENDING` | Operator applications |
| POST | `/admin/operators/:operatorId/approve` | Approve operator |
| POST | `/admin/operators/:operatorId/suspend` | Suspend operator |
| GET | `/admin/users` | User directory |
| PATCH | `/admin/users/:userId/status` | Suspend/reactivate user |
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/incidents` | Incident monitor |
| GET | `/admin/audit-logs` | Audit trail |
| GET/PATCH | `/admin/config` | Platform configuration |

---

## Shared conventions for all modules

- Pagination: `?page=1&pageSize=20` → `data: { items: [], pagination: { page, pageSize, total, totalPages } }`.
- Dates in queries: `YYYY-MM-DD`. Date-times in responses: ISO-8601 UTC.
- Money: integer ngwee everywhere.
- Operator-scoped resources always verify `operatorId` ownership; another operator's
  resource returns `404` (not `403`) so IDs cannot be probed.
