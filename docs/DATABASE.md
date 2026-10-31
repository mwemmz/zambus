# Database design

PostgreSQL 17 + Prisma. Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).

## Conventions

- IDs: cuid strings (URL-safe, non-sequential).
- Money: `Int` ngwee (1 ZMW = 100 ngwee). Never floats for money.
- Timestamps: `DateTime` UTC.
- Business records are never hard-deleted; status fields are used so history and audit
  survive (`User.status`, `Trip.status`, `Booking.status`, ...).
- Every foreign key is indexed.

## Entity groups

### Identity and access

| Table | Purpose | Key constraints |
|---|---|---|
| `User` | All platform accounts | unique `email`, unique `phone` |
| `Role` | 5 roles: PASSENGER, OPERATOR, DRIVER, CONDUCTOR, ADMIN | unique `name` |
| `Permission` | Capability codes, e.g. `tickets:verify` | unique `code` |
| `RolePermission` | Role → permission mapping | PK `(roleId, permissionId)` |
| `UserRole` | User → role mapping (a user may hold several) | PK `(userId, roleId)` |
| `PassengerProfile` | Passenger-specific data | unique `userId`, unique `nationalId` |
| `RefreshToken` | Hashed rotating refresh tokens | unique `tokenHash`, index `userId` |
| `PasswordResetToken` | Single-use reset tokens | unique `tokenHash` |

Roles and permissions are stored in the database, not just in code, so an administrator
can adjust capabilities without a redeploy.

### Operators and fleet

| Table | Purpose | Key constraints |
|---|---|---|
| `Operator` | Bus company profile and approval state | unique `registrationNo` |
| `OperatorStaff` | Links a user to an operator with a staff role | unique `(operatorId, userId)` |
| `Bus` | Fleet record | unique `registrationNo`, `capacity > 0` |
| `Seat` | Physical seat layout per bus | unique `(busId, seatNumber)` |

A user is only linked to one operator in the prototype (`OperatorStaff` supports more, but
the auth service resolves the first active membership).

### Network and trips

| Table | Purpose | Key constraints |
|---|---|---|
| `Route` | Origin → destination with distance | index `(origin, destination)` |
| `RouteStop` | Ordered stops (forward-compatible with multi-stop routes) | unique `(routeId, sequenceNo)` |
| `Schedule` | Recurring departure template | index `routeId`, `busId` |
| `Trip` | A bookable departure on a date | index `(departureAt, status)` |
| `TripSeat` | **Seat inventory for one trip** | unique `(tripId, seatNumber)` |
| `TripCrew` | Driver/conductor assignment | unique `(tripId, userId)` |

### The seat allocation primitive

`TripSeat` is the concurrency control point. Publishing a trip copies the bus layout into
`TripSeat` rows with `status = AVAILABLE`. Booking a seat is a conditional update:

```sql
UPDATE "TripSeat"
   SET status = 'HELD', "holdToken" = $1, "holdExpiresAt" = $2
 WHERE "tripId" = $3 AND "seatNumber" = ANY($4) AND status = 'AVAILABLE';
```

The affected-row count must equal the number of requested seats, otherwise the transaction
rolls back with `409 SEAT_UNAVAILABLE`. Because PostgreSQL row locks serialise concurrent
updates on the same row, two passengers cannot obtain the same seat. The unique constraint
is a second line of defence.

### Booking, payment, ticketing

| Table | Purpose | Key constraints |
|---|---|---|
| `Booking` | Reservation, 5-minute hold, then confirmed/cancelled/expired | unique `reference`; **partial unique** `(passengerId, tripId)` where status is live |
| `BookingSeat` | Seat + passenger detail per booking | unique `(bookingId, seatNumber)` |
| `Payment` | Simulated or future real transaction | unique `transactionRef`, unique `idempotencyKey` |
| `Ticket` | Digital ticket and QR hash | unique `ticketNumber`, unique `(bookingId, seatNumber)` |
| `TicketVerification` | Every scan attempt with verifier and result | **partial unique** `(ticketId)` where result = `ACCEPTED` |

Notes:

- `Payment.idempotencyKey` makes retried payment calls safe.
- `Ticket.qrTokenHash` stores only the HMAC digest of the signed QR token. A leaked
  database cannot be used to mint valid QR codes without `TICKET_QR_SECRET`.
- The partial unique index guarantees at most one `ACCEPTED` verification per ticket, so a
  ticket cannot be boarded twice even under concurrent scans.

### Operations

| Table | Purpose |
|---|---|
| `TripIncident` | Delays, breakdowns, accidents with severity and resolution |
| `Notification` | In-app notifications |
| `Feedback` | Passenger ratings (1–5) and comments |
| `AuditLog` | Sensitive operations with actor, entity, metadata, IP |
| `SystemConfig` | Platform configuration key/value |

Passenger manifests are **derived** from confirmed bookings rather than stored, so they
cannot drift from the booking state.

### GreenTrack

| Table | Purpose |
|---|---|
| `FuelRecord` | One record per trip: fuel type, litres, distance, submitter |
| `EmissionFactor` | Versioned, documented kg CO₂ per litre per fuel type |
| `GreenCalculation` | Snapshot of a computed report with methodology version and factor used |

`FuelRecord.tripId` is unique: one authoritative fuel record per trip. Correction is an
update with an audit entry, not a duplicate row.

`GreenCalculation` exists so a report produced last month remains explainable after an
emission factor changes. It stores the metrics JSON, the factor ID and the methodology
version at computation time.

## Integrity constraints added by SQL migration

Prisma cannot express these declaratively, so
`prisma/migrations/*_integrity_constraints/migration.sql` adds:

1. `booking_one_active_per_passenger_trip` — partial unique index preventing two live
   bookings by the same passenger for the same trip.
2. `ticket_single_accepted_verification` — partial unique index preventing duplicate
   boarding.
3. `trip_seat_number_unique` — defensive unique index on seat inventory.
4. `fuel_litres_positive`, `fuel_distance_positive` — fuel records must describe a real
   journey.
5. `emission_factor_positive`, `bus_capacity_positive`, `trip_fare_non_negative`,
   `trip_seats_non_negative`, `booking_total_non_negative`, `payment_amount_positive`,
   `feedback_rating_range`.

## Migration workflow

```bash
npm run prisma:migrate        # create + apply a migration in development
npm run prisma:deploy         # apply existing migrations (CI/production)
npm run db:reset              # drop, recreate, migrate and seed
npm run seed
```

Never edit an applied migration; add a new one. The schema is the shared contract between
the three developers — announce changes before merging.
