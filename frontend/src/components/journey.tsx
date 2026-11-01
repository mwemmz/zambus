import { useEffect, useState, type ReactNode } from 'react';
import { cx, fmtDate, fmtDuration, fmtMoney } from '../lib/format';
import { Badge, StatusBadge } from './ui';
import type { Trip } from '../lib/types';

/** Horizontal progress rail: Seats → Review → Ticket. */
export function JourneySteps({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="steps" aria-label="Booking progress">
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo';
        return (
          <li key={step} className={cx('step', `step-${state}`)}>
            <span className="step-dot">{state === 'done' ? '✓' : index + 1}</span>
            <span className="step-label">{step}</span>
            {index < steps.length - 1 && <span className="step-line" />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Countdown for the seat hold. The backend releases PENDING bookings after the
 * configured seat-lock window (10 minutes by default), so this timer is real —
 * not decoration.
 */
export function HoldTimer({ since, minutes = 10 }: { since: string | Date; minutes?: number }) {
  const start = typeof since === 'string' ? new Date(since).getTime() : since.getTime();
  const deadline = start + minutes * 60_000;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, deadline - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  const low = remaining < 2 * 60_000;

  if (remaining <= 0) {
    return <span className="hold-timer hold-timer-expired">Seat hold expired</span>;
  }

  return (
    <span className={cx('hold-timer', low && 'hold-timer-low')}>
      Seats held for {mm}:{ss.toString().padStart(2, '0')}
    </span>
  );
}

/** Trip recap used on the seat, review and ticket screens. */
export function TripSummary({ trip, compact }: { trip: Trip; compact?: boolean }) {
  const origin = trip.route?.origin ?? 'Origin';
  const destination = trip.route?.destination ?? 'Destination';
  const arrival = new Date(trip.departureTime).getTime();

  return (
    <div className={cx('trip-summary-card', compact && 'trip-summary-compact')}>
      <div className="trip-summary-head">
        <div>
          <span className="muted small">Your trip</span>
          <h2>
            {origin} <span className="arrow">→</span> {destination}
          </h2>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      <div className="trip-summary-times">
        <div>
          <span className="muted small">Departs</span>
          <strong>{fmtDate(trip.departureTime)}</strong>
        </div>
        <div className="trip-summary-duration">
          <span className="trip-line" />
          <span className="muted small">{fmtDuration(trip.route?.estimatedTravelTime)}</span>
        </div>
        <div>
          <span className="muted small">Arrives</span>
          <strong>{fmtDate(trip.estimatedArrival)}</strong>
        </div>
      </div>

      <div className="chips">
        <Badge tone="primary">{trip.busCategory ?? 'Standard'}</Badge>
        <Badge>{trip.bus?.registrationNumber ?? 'Bus'}</Badge>
        <Badge>{trip.bus?.model ?? '—'}</Badge>
        {!Number.isNaN(arrival) && <Badge tone="info">{trip.bus?.seatCapacity ?? '—'} seats</Badge>}
      </div>

      {trip.bus?.amenities?.length ? (
        <p className="muted small">{trip.bus.amenities.join(' · ')}</p>
      ) : null}
    </div>
  );
}

/** Sticky order panel: seats, fare breakdown, primary action. */
export function BookingSummaryPanel({
  trip,
  seats,
  pax,
  children,
  footer,
}: {
  trip: Trip;
  seats: number[];
  pax: number;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const fare = Number(trip.fareAmount ?? 0);
  const total = fare * seats.length;

  return (
    <aside className="summary-panel">
      <div className="summary-panel-head">
        <span className="muted small">Order summary</span>
        <strong>
          {trip.route?.origin} → {trip.route?.destination}
        </strong>
        <span className="muted small">{fmtDate(trip.departureTime)}</span>
      </div>

      <div className="summary-seats">
        <span className="muted small">
          Seats {seats.length ? `(${seats.length} of ${pax})` : 'not selected'}
        </span>
        <div className="summary-seat-chips">
          {seats.length === 0 && <span className="muted small">Pick from the seat map</span>}
          {seats.map((seat) => (
            <span key={seat} className="summary-seat">
              {seat}
            </span>
          ))}
        </div>
      </div>

      <dl className="summary-lines">
        <div>
          <dt>
            Fare × {seats.length || 0}
          </dt>
          <dd>{fmtMoney(total)}</dd>
        </div>
        <div>
          <dt>Booking fee</dt>
          <dd>{fmtMoney(0)}</dd>
        </div>
      </dl>

      <div className="summary-total">
        <span>Total</span>
        <strong>{fmtMoney(total)}</strong>
      </div>

      {children}

      {footer && <div className="summary-footer">{footer}</div>}
    </aside>
  );
}
