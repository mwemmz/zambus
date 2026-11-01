import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { cx, fmtDate, fmtMoney } from '../lib/format';
import { BookingSummaryPanel, HoldTimer, JourneySteps, TripSummary } from '../components/journey';
import { MobileMoneyPayment, maskMobile } from '../components/MobileMoneyPayment';
import type { Booking, SeatMap, Trip } from '../lib/types';
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  Loading,
  Notice,
  StatusBadge,
} from '../components/ui';

const STEPS = ['Seats', 'Sign up & pay', 'Ticket'];

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function SeatButton({
  seat,
  selected,
  disabled,
  onSelect,
}: {
  seat: { seatNumber: number; available: boolean };
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cx('seat', !seat.available && 'seat-taken', selected && 'seat-selected')}
      disabled={!seat.available || disabled}
      onClick={onSelect}
      title={seat.available ? `Seat ${seat.seatNumber}` : `Seat ${seat.seatNumber} is taken`}
      aria-pressed={selected}
    >
      {seat.seatNumber}
    </button>
  );
}

export function TripBookingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [params] = useSearchParams();
  const paxParam = Number(params.get('pax') ?? 1);
  const pax = Number.isFinite(paxParam) && paxParam > 0 ? Math.min(paxParam, 6) : 1;

  const { register, user } = useAuth();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState({
    fullName: '',
    email: '',
    phoneNumber: '+260',
    password: '',
  });

  const trip = useFetch(() => api<Trip>(`/trips/${tripId}`), [tripId]);
  const seats = useFetch(() => api<SeatMap>(`/trips/${tripId}/seats`), [tripId], {
    // Poll only while the passenger is picking seats.
    refreshMs: step === 0 ? 5_000 : undefined,
  });

  const seatRows = useMemo(() => chunk(seats.data?.seats ?? [], 4), [seats.data]);
  const allConfirmed = bookings.length > 0 && bookings.every((b) => b.paymentStatus === 'CONFIRMED');

  useEffect(() => {
    if (allConfirmed) setStep(2);
  }, [allConfirmed]);

  const toggleSeat = (seatNumber: number) => {
    setSelected((current) => {
      if (current.includes(seatNumber)) return current.filter((seat) => seat !== seatNumber);
      // Respect the passenger count chosen in search — no silent swapping.
      if (current.length >= pax) return current;
      return [...current, seatNumber];
    });
  };

  const holdSeats = async () => {
    if (!tripId || selected.length === 0) return;
    setBusy(true);
    setError(null);

    const held: Booking[] = [];
    try {
      for (const seatNumber of selected) {
        const booking = await api<Booking>('/bookings', {
          method: 'POST',
          body: { tripId, seatNumber },
        });
        held.push(booking);
      }
      setBookings(held);
      setStep(1);
      seats.reload();
    } catch (err) {
      // Release anything we already grabbed so the passenger never leaves
      // orphaned holds behind (they would keep seats off the map for 10 min).
      await Promise.all(
        held.map((booking) =>
          api(`/bookings/${booking.bookingId}/cancel`, { method: 'POST' }).catch(() => undefined),
        ),
      );
      setError(errorMessage(err));
      seats.reload();
    } finally {
      setBusy(false);
    }
  };

  const updateAccount = (key: keyof typeof account) => (event: ChangeEvent<HTMLInputElement>) =>
    setAccount((current) => ({ ...current, [key]: event.target.value }));

  const createAccountAndHoldSeats = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        fullName: account.fullName.trim(),
        email: account.email.trim(),
        phoneNumber: account.phoneNumber.trim(),
        password: account.password,
      });
      await holdSeats();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const releaseHolds = async () => {
    setBusy(true);
    setError(null);
    try {
      await Promise.all(
        bookings
          .filter((booking) => booking.paymentStatus === 'PENDING')
          .map((booking) =>
            api(`/bookings/${booking.bookingId}/cancel`, { method: 'POST' }).catch(() => undefined),
          ),
      );
    } finally {
      setBookings([]);
      setSelected([]);
      setStep(0);
      setBusy(false);
      seats.reload();
    }
  };

  const pay = async (mobileNumber: string, pin: string) => {
    const confirmed: Booking[] = [];
    for (const booking of bookings) {
      const updated = await api<Booking>(`/bookings/${booking.bookingId}/confirm`, {
        method: 'POST',
        body: { paymentMethod: 'MOBILE_MONEY', mobileNumber, pin },
      });
      confirmed.push(updated);
    }
    setBookings(confirmed);
    setStep(2);
    return confirmed;
  };

  const fare = Number(trip.data?.fareAmount ?? 0);
  const total = fare * selected.length;

  if (trip.loading && !trip.data) return <div className="p-section"><Loading text="Loading trip…" /></div>;
  if (trip.error) {
    return (
      <div className="p-section">
        <ErrorBox error={trip.error} onRetry={trip.reload} />
      </div>
    );
  }
  if (!trip.data) return null;

  return (
    <div className="booking-page">
      <div className="booking-head">
        <JourneySteps steps={STEPS} current={step} />
        <Link className="btn btn-ghost btn-sm" to="/search">
          ← Back to results
        </Link>
      </div>

      <div className="booking-grid">
        <div className="booking-main">
          {error && (
            <Notice tone="danger" title="That did not work">
              {error}
            </Notice>
          )}

          {step === 0 && (
            <Card
              title="Choose your seats"
              subtitle={`Fares are per seat. Pick ${pax > 1 ? `up to ${pax} seats` : 'a seat'} — they are held for 10 minutes once you continue.`}
              actions={<span className="muted small">{seats.data?.availableSeats.length ?? '—'} available</span>}
            >
              {seats.loading && !seats.data && <Loading text="Loading seat map…" />}
              {seats.error && <ErrorBox error={seats.error} onRetry={seats.reload} />}

              {seats.data && (
                <>
                  <div className="seat-legend">
                    <span>
                      <i className="dot dot-available" /> Available
                    </span>
                    <span>
                      <i className="dot dot-taken" /> Taken
                    </span>
                    <span>
                      <i className="dot dot-selected" /> Your selection
                    </span>
                  </div>

                  <div className="seat-cabin">
                    <div className="seat-cabin-front">
                      <span className="muted small">Front · driver</span>
                    </div>
                    <div className="seat-rows">
                      {seatRows.map((row, rowIndex) => (
                        <div className="seat-row" key={rowIndex}>
                          {row.slice(0, 2).map((seat) => (
                            <SeatButton
                              key={seat.seatNumber}
                              seat={seat}
                              selected={selected.includes(seat.seatNumber)}
                              disabled={busy}
                              onSelect={() => toggleSeat(seat.seatNumber)}
                            />
                          ))}
                          <span className="aisle" />
                          {row.slice(2).map((seat) => (
                            <SeatButton
                              key={seat.seatNumber}
                              seat={seat}
                              selected={selected.includes(seat.seatNumber)}
                              disabled={busy}
                              onSelect={() => toggleSeat(seat.seatNumber)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="muted small seat-hint">
                    {selected.length === 0
                      ? `Tap ${pax > 1 ? `up to ${pax} seats` : 'a seat'} to start. Taken seats are blocked.`
                      : selected.length >= pax
                        ? `All ${pax} seat${pax > 1 ? 's' : ''} chosen — tap one to remove it.`
                        : `${pax - selected.length} more seat${pax - selected.length > 1 ? 's' : ''} to pick.`}
                  </p>
                </>
              )}
            </Card>
          )}

          {step === 1 && (
            <>
              {!user && (
                <Card
                  title="Create your passenger account"
                  subtitle="You only need to sign up when you are ready to reserve your selected seats."
                >
                  <form onSubmit={createAccountAndHoldSeats} className="form-stack">
                    <Field label="Full name" required>
                      <Input
                        value={account.fullName}
                        onChange={updateAccount('fullName')}
                        minLength={2}
                        required
                      />
                    </Field>
                    <Field label="Email" required>
                      <Input
                        type="email"
                        value={account.email}
                        onChange={updateAccount('email')}
                        required
                      />
                    </Field>
                    <Field label="Phone number" hint="At least 10 characters, e.g. +260977000000" required>
                      <Input
                        value={account.phoneNumber}
                        onChange={updateAccount('phoneNumber')}
                        minLength={10}
                        required
                      />
                    </Field>
                    <Field label="Password" hint="At least 6 characters" required>
                      <Input
                        type="password"
                        value={account.password}
                        onChange={updateAccount('password')}
                        minLength={6}
                        required
                      />
                    </Field>
                    <Button type="submit" size="lg" disabled={busy}>
                      {busy ? 'Creating account…' : 'Create account and continue'}
                    </Button>
                  </form>
                </Card>
              )}

              {user && (
                <>
              <Card
                title="Check your booking"
                subtitle="This is the passenger the ticket will be issued to."
              >
                <div className="passenger-card">
                  <div className="avatar">{user?.fullName?.charAt(0).toUpperCase() ?? 'Z'}</div>
                  <div>
                    <strong>{user?.fullName ?? 'Passenger'}</strong>
                    <div className="muted small">{user?.email}</div>
                    <div className="muted small">{user?.phoneNumber}</div>
                  </div>
                </div>

                <div className="held-seats">
                  {bookings.map((booking) => (
                    <div key={booking.bookingId} className="held-seat">
                      <span className="held-seat-number">{booking.seatNumber}</span>
                      <div>
                        <strong>Seat {booking.seatNumber}</strong>
                        <div className="muted small">Booking ref {booking.bookingId.slice(0, 8)}…</div>
                      </div>
                      <div className="row-actions">
                        <StatusBadge status={booking.paymentStatus} />
                        <span className="fare">{fmtMoney(fare)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {bookings[0]?.createdAt && (
                  <div className="hold-row">
                    <HoldTimer since={bookings[0].createdAt} />
                    <span className="muted small">
                      The seats return to the pool automatically when this runs out.
                    </span>
                  </div>
                )}
              </Card>

              <Card title="Pay with mobile money" subtitle="A prompt is sent to your handset.">
                <MobileMoneyPayment
                  amountLabel={fmtMoney(total)}
                  routeLabel={`${trip.data.route?.origin} → ${trip.data.route?.destination}`}
                  seatNumber={bookings[0]?.seatNumber ?? selected[0] ?? 0}
                  seatLabel={selected.join(', ')}
                  onApprove={pay}
                  onCancelBooking={releaseHolds}
                  cancelDisabled={busy}
                />
              </Card>
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Card tone="primary" className="success-card">
                <div className="success-mark">✓</div>
                <h2>You are booked</h2>
                <p className="muted">
                  Show the QR {bookings.length > 1 ? 'codes' : 'code'} below at the door. The driver scans it
                  to check you in.
                </p>
                <div className="row-actions">
                  <Link className="btn btn-primary btn-md" to="/my-trips">
                    View my trips
                  </Link>
                  <Link className="btn btn-ghost btn-md" to="/search">
                    Book another trip
                  </Link>
                </div>
              </Card>

              <div className="ticket-grid-2">
                {bookings.map((booking) => (
                  <div key={booking.bookingId} className="mini-ticket">
                    <div className="mini-ticket-qr">
                      <QRCodeSVG value={booking.qrCodeData} size={132} bgColor="#ffffff" fgColor="#101828" />
                    </div>
                    <div className="mini-ticket-info">
                      <strong>Seat {booking.seatNumber}</strong>
                      <span className="muted small">
                        {trip.data?.route?.origin} → {trip.data?.route?.destination}
                      </span>
                      <span className="muted small">{fmtDate(trip.data?.departureTime)}</span>
                      {booking.payerMobile && (
                        <span className="muted small">Paid with {maskMobile(booking.payerMobile)}</span>
                      )}
                      <Badge tone="success">Confirmed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="booking-side">
          <TripSummary trip={trip.data} compact />

          {step === 0 && (
            <BookingSummaryPanel trip={trip.data} seats={selected} pax={pax}>
              <Button
                size="lg"
                disabled={selected.length === 0 || busy}
                onClick={() => {
                  if (user) {
                    void holdSeats();
                  } else {
                    setStep(1);
                  }
                }}
              >
                {busy
                  ? 'Holding seats…'
                  : selected.length === 0
                    ? 'Select a seat to continue'
                    : `Continue with ${selected.length} seat${selected.length > 1 ? 's' : ''}`}
              </Button>
              <p className="muted small">
                Nothing is charged yet. You create an account only when you are ready to check out.
              </p>
            </BookingSummaryPanel>
          )}

          {step === 1 && user && (
            <BookingSummaryPanel
              trip={trip.data}
              seats={bookings.map((booking) => booking.seatNumber)}
              pax={pax}
            >
              <p className="muted small">
                Approve the mobile money prompt on your phone to complete the booking.
              </p>
              <Button variant="ghost" disabled={busy} onClick={releaseHolds}>
                Release seats
              </Button>
            </BookingSummaryPanel>
          )}
        </div>
      </div>
    </div>
  );
}
