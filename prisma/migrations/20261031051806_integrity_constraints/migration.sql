-- Integrity constraints that Prisma cannot express declaratively.
-- Applied after the initial schema migration.

-- 1. A passenger may only have one live booking per trip (PENDING_PAYMENT or CONFIRMED).
--    Prevents duplicate bookings that would hold the same seats twice.
CREATE UNIQUE INDEX "booking_one_active_per_passenger_trip"
  ON "Booking" ("passengerId", "tripId")
  WHERE "status" IN ('PENDING_PAYMENT', 'CONFIRMED');

-- 2. A ticket may only be boarded once: at most one ACCEPTED verification per ticket.
CREATE UNIQUE INDEX "ticket_single_accepted_verification"
  ON "TicketVerification" ("ticketId")
  WHERE "result" = 'ACCEPTED';

-- 3. Only one live hold per seat is meaningful; the conditional UPDATE in the booking
--    service relies on the row-level lock of this row, so this index is defensive.
CREATE UNIQUE INDEX "trip_seat_number_unique"
  ON "TripSeat" ("tripId", "seatNumber");

-- 4. Fuel records must describe a real journey.
ALTER TABLE "FuelRecord"
  ADD CONSTRAINT "fuel_litres_positive" CHECK ("litresConsumed" > 0),
  ADD CONSTRAINT "fuel_distance_positive" CHECK ("distanceKm" > 0);

-- 5. Emission factors must be physically meaningful.
ALTER TABLE "EmissionFactor"
  ADD CONSTRAINT "emission_factor_positive" CHECK ("kgCo2PerLitre" >= 0);

-- 6. Fleet and trip sanity checks.
ALTER TABLE "Bus"
  ADD CONSTRAINT "bus_capacity_positive" CHECK ("capacity" > 0);

ALTER TABLE "Trip"
  ADD CONSTRAINT "trip_fare_non_negative" CHECK ("fareNgwee" >= 0),
  ADD CONSTRAINT "trip_seats_non_negative" CHECK ("availableSeatCount" >= 0);

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_total_non_negative" CHECK ("totalNgwee" >= 0);

ALTER TABLE "Payment"
  ADD CONSTRAINT "payment_amount_positive" CHECK ("amountNgwee" > 0);

-- 7. Ratings are 1..5 stars.
ALTER TABLE "Feedback"
  ADD CONSTRAINT "feedback_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
