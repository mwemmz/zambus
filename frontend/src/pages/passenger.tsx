import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { cx, fmtDate, fmtDuration, fmtMoney, splitList } from '../lib/format';
import { MobileMoneyPayment, maskMobile } from '../components/MobileMoneyPayment';
import type { Booking, BookingDetails, BookingListItem, SeatMap, Trip, TripSearchResult } from '../lib/types';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  KeyValue,
  LiveBadge,
  Loading,
  Notice,
  PageHeader,
  Select,
  StatusBadge,
} from '../components/ui';

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export function SearchTripsPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ origin: '', destination: '', travelDate: '', filter: '' });
  const [query, setQuery] = useState('limit=20');
  const trips = useFetch(() => api<TripSearchResult>(`/trips?${query}`), [query], { refreshMs: 10_000 });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (form.origin.trim()) params.set('origin', form.origin.trim());
    if (form.destination.trim()) params.set('destination', form.destination.trim());
    if (form.travelDate) params.set('travelDate', form.travelDate);
    if (form.filter) params.set('filter', form.filter);
    params.set('limit', '20');
    setQuery(params.toString());
  };

  const reset = () => {
    setForm({ origin: '', destination: '', travelDate: '', filter: '' });
    setQuery('limit=20');
  };

  return (
    <div className="page">
      <PageHeader
        title="Find a trip"
        subtitle="Search the public trip feed, then pick a seat. Booking reserves a seat for 10 minutes."
      />

      <Card title="Search filters" subtitle="GET /api/trips">
        <form className="filter-grid" onSubmit={submit}>
          <Field label="Origin">
            <Input
              placeholder="Lusaka"
              value={form.origin}
              onChange={(event) => setForm({ ...form, origin: event.target.value })}
            />
          </Field>
          <Field label="Destination">
            <Input
              placeholder="Livingstone"
              value={form.destination}
              onChange={(event) => setForm({ ...form, destination: event.target.value })}
            />
          </Field>
          <Field label="Travel date">
            <Input
              type="date"
              value={form.travelDate}
              onChange={(event) => setForm({ ...form, travelDate: event.target.value })}
            />
          </Field>
          <Field label="Sort">
            <Select
              value={form.filter}
              onChange={(event) => setForm({ ...form, filter: event.target.value })}
            >
              <option value="">Earliest departure</option>
              <option value="lowestPrice">Lowest price</option>
            </Select>
          </Field>
          <div className="filter-actions">
            <Button type="submit">Search</Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Reset
            </Button>
          </div>
        </form>
      </Card>

      <div className="results-head">
        <span>
          {trips.loading ? 'Searching…' : `${trips.data?.total ?? 0} trip(s) found`}
        </span>
        <div className="row-actions">
          <LiveBadge refreshing={trips.refreshing} />
          {trips.data && <span className="muted">{trips.data.page} / {Math.max(1, trips.data.totalPages)}</span>}
        </div>
      </div>

      {trips.loading && <Loading />}
      {trips.error && <ErrorBox error={trips.error} onRetry={trips.reload} />}
      {!trips.loading && !trips.error && (trips.data?.trips.length ?? 0) === 0 && (
        <Empty title="No trips match those filters" hint="Try clearing the origin/destination or changing the date." />
      )}

      <div className="card-grid">
        {trips.data?.trips.map((trip) => (
          <article key={trip.tripId} className="trip-card">
            <div className="trip-card-top">
              <div>
                <h3>{trip.route?.routeName ?? 'Trip'}</h3>
                <p className="muted">
                  {trip.route?.origin} → {trip.route?.destination}
                </p>
              </div>
              <StatusBadge status={trip.status} />
            </div>

            <div className="trip-times">
              <div>
                <span className="muted">Departs</span>
                <strong>{fmtDate(trip.departureTime)}</strong>
              </div>
              <div>
                <span className="muted">Arrives</span>
                <strong>{fmtDate(trip.estimatedArrival)}</strong>
              </div>
            </div>

            <div className="chips">
              <Badge tone="primary">{trip.busCategory ?? 'Standard'}</Badge>
              <Badge>{trip.bus?.registrationNumber ?? 'Bus'}</Badge>
              <Badge>{trip.bus?.model ?? '—'}</Badge>
              {trip.isRecurring && <Badge tone="info">Recurring</Badge>}
            </div>

            <div className="trip-card-bottom">
              <div>
                <div className="fare">{fmtMoney(trip.fareAmount)}</div>
                <div className="muted">{trip.remainingSeats ?? '—'} seats left</div>
              </div>
              <Button onClick={() => navigate(`/app/trips/${trip.tripId}`)}>Select seat</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const trip = useFetch(() => api<Trip>(`/trips/${tripId}`), [tripId], { refreshMs: 15_000 });
  const seats = useFetch(() => api<SeatMap>(`/trips/${tripId}/seats`), [tripId], { refreshMs: 4_000 });
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seatRows = useMemo(() => chunk(seats.data?.seats ?? [], 4), [seats.data]);

  const reserve = async () => {
    if (!tripId || !selectedSeat) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<Booking>('/bookings', {
        method: 'POST',
        body: { tripId, seatNumber: selectedSeat },
      });
      setBooking(created);
      seats.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const cancelled = await api<Booking>(`/bookings/${booking.bookingId}/cancel`, { method: 'POST' });
      setBooking(cancelled);
      setSelectedSeat(null);
      seats.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Select a seat"
        subtitle="Pick a seat, then approve the mobile money prompt on your phone to get your QR ticket."
        actions={<Button variant="ghost" onClick={() => navigate('/app/trips')}>Back to search</Button>}
      />

      {trip.loading && <Loading />}
      {trip.error && <ErrorBox error={trip.error} onRetry={trip.reload} />}

      {trip.data && (
        <>
          <Card className="trip-summary">
            <div className="trip-summary-top">
              <div>
                <h2>{trip.data.route?.routeName ?? 'Trip'}</h2>
                <p className="muted">
                  {trip.data.route?.origin} → {trip.data.route?.destination}
                </p>
              </div>
              <StatusBadge status={trip.data.status} />
            </div>
            <div className="summary-grid">
              <KeyValue
                items={[
                  { label: 'Departs', value: fmtDate(trip.data.departureTime) },
                  { label: 'Arrives', value: fmtDate(trip.data.estimatedArrival) },
                  { label: 'Travel time', value: fmtDuration(trip.data.route?.estimatedTravelTime) },
                  { label: 'Fare', value: fmtMoney(trip.data.fareAmount) },
                ]}
              />
              <KeyValue
                items={[
                  { label: 'Bus', value: trip.data.bus?.registrationNumber ?? '—' },
                  { label: 'Model', value: trip.data.bus?.model ?? '—' },
                  { label: 'Capacity', value: trip.data.bus?.seatCapacity ?? '—' },
                  {
                    label: 'Amenities',
                    value: trip.data.bus?.amenities?.length ? trip.data.bus.amenities.join(', ') : '—',
                  },
                ]}
              />
            </div>
          </Card>

          <div className="two-col">
            <Card
              title="Seat map"
              subtitle="Green is available, red is taken, blue is your selection."
              actions={<LiveBadge refreshing={seats.refreshing} />}
            >
              {seats.loading && <Loading text="Loading seats…" />}
              {seats.error && <ErrorBox error={seats.error} onRetry={seats.reload} />}
              {seats.data && (
                <>
                  <div className="seat-legend">
                    <span><i className="dot dot-available" /> Available</span>
                    <span><i className="dot dot-taken" /> Taken</span>
                    <span><i className="dot dot-selected" /> Selected</span>
                  </div>
                  <div className="seat-rows">
                    {seatRows.map((row, rowIndex) => (
                      <div className="seat-row" key={rowIndex}>
                        {row.slice(0, 2).map((seat) => (
                          <SeatButton
                            key={seat.seatNumber}
                            seat={seat}
                            selected={selectedSeat === seat.seatNumber}
                            disabled={Boolean(booking)}
                            onSelect={() => setSelectedSeat(seat.seatNumber)}
                          />
                        ))}
                        <span className="aisle" />
                        {row.slice(2).map((seat) => (
                          <SeatButton
                            key={seat.seatNumber}
                            seat={seat}
                            selected={selectedSeat === seat.seatNumber}
                            disabled={Boolean(booking)}
                            onSelect={() => setSelectedSeat(seat.seatNumber)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className="muted small">
                    {seats.data.availableSeats.length} of {seats.data.busCapacity} seats available
                  </p>
                </>
              )}
            </Card>

            <Card title="Booking" subtitle="Reserve the seat, then pay from your mobile wallet.">
              {error && <Notice tone="danger" title="Booking failed">{error}</Notice>}

              {!booking && (
                <div className="stack">
                  <div className="selection-box">
                    <span className="muted">Selected seat</span>
                    <strong>{selectedSeat ? `Seat ${selectedSeat}` : 'None'}</strong>
                  </div>
                  <Button disabled={!selectedSeat || busy} onClick={reserve}>
                    {busy ? 'Reserving…' : 'Reserve seat'}
                  </Button>
                  <p className="muted small">
                    Reserving creates a PENDING booking. Any booking blocks the seat, so confirm promptly.
                  </p>
                </div>
              )}

              {booking && (
                <div className="stack">
                  <div className="selection-box">
                    <span className="muted">Booking ID</span>
                    <code>{booking.bookingId}</code>
                    <div className="chips">
                      <StatusBadge status={booking.paymentStatus} />
                      <StatusBadge status={booking.boardingStatus} />
                      <Badge>Seat {booking.seatNumber}</Badge>
                    </div>
                  </div>

                  {booking.paymentStatus === 'PENDING' && (
                    <>
                      <Notice tone="warning" title="Seat reserved">
                        Seat {booking.seatNumber} is held for you. Enter your mobile number below — we send a
                        payment prompt to that phone, and the ticket is issued as soon as you approve it with
                        your 4-digit PIN.
                      </Notice>
                      <MobileMoneyPayment
                        amountLabel={fmtMoney(trip.data?.fareAmount ?? 0)}
                        routeLabel={
                          trip.data?.route
                            ? `${trip.data.route.origin} → ${trip.data.route.destination}`
                            : 'ZamBus trip'
                        }
                        seatNumber={booking.seatNumber}
                        onCancelBooking={cancel}
                        cancelDisabled={busy}
                        onApprove={async (mobileNumber, pin) => {
                          const confirmed = await api<Booking>(`/bookings/${booking.bookingId}/confirm`, {
                            method: 'POST',
                            body: { paymentMethod: 'MOBILE_MONEY', mobileNumber, pin },
                          });
                          setBooking(confirmed);
                          setError(null);
                          seats.reload();
                          return confirmed;
                        }}
                      />
                    </>
                  )}

                  {booking.paymentStatus === 'CONFIRMED' && (
                    <>
                      <Notice tone="success" title="Payment approved">
                        The ticket is ready.{' '}
                        {booking.payerMobile
                          ? `Paid with ${maskMobile(booking.payerMobile)}${
                              booking.paymentReference ? ` · ${booking.paymentReference}` : ''
                            }.`
                          : ''}
                      </Notice>
                      <Button onClick={() => navigate(`/app/bookings/${booking.bookingId}`)}>Open ticket</Button>
                    </>
                  )}

                  {booking.paymentStatus === 'REFUNDED' && (
                    <Notice tone="danger" title="Booking cancelled">
                      The booking is marked REFUNDED. Select another seat to book again.
                    </Notice>
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => {
                      setBooking(null);
                      setSelectedSeat(null);
                      seats.reload();
                    }}
                  >
                    Start over
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
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
    >
      {seat.seatNumber}
    </button>
  );
}

export function MyBookingsPage() {
  const navigate = useNavigate();
  const bookings = useFetch(() => api<BookingListItem[]>('/bookings/my'), [], { refreshMs: 10_000 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = async (bookingId: string) => {
    if (!window.confirm('Cancel this booking and mark it refunded?')) return;
    setBusyId(bookingId);
    setError(null);
    try {
      await api(`/bookings/${bookingId}/cancel`, { method: 'POST' });
      bookings.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const list = bookings.data ?? [];

  return (
    <div className="page">
      <PageHeader
        title="My bookings"
        subtitle="View tickets, check boarding status and cancel pending bookings."
        actions={
          <div className="row-actions">
            <LiveBadge refreshing={bookings.refreshing} />
            <Button onClick={() => navigate('/app/trips')}>Book another trip</Button>
          </div>
        }
      />

      {error && <Notice tone="danger" title="Action failed">{error}</Notice>}
      {bookings.loading && <Loading />}
      {bookings.error && <ErrorBox error={bookings.error} onRetry={bookings.reload} />}
      {!bookings.loading && !bookings.error && list.length === 0 && (
        <Empty
          title="No bookings yet"
          hint="Search for a trip and reserve a seat."
          action={<Button onClick={() => navigate('/app/trips')}>Find a trip</Button>}
        />
      )}

      {list.length > 0 && (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Seat</th>
                  <th>Departure</th>
                  <th>Payment</th>
                  <th>Boarding</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((booking) => (
                  <tr key={booking.bookingId}>
                    <td>
                      <strong>{booking.trip?.routeName ?? '—'}</strong>
                      <div className="muted small">
                        {booking.trip?.origin} → {booking.trip?.destination}
                      </div>
                    </td>
                    <td>{booking.seatNumber}</td>
                    <td>{fmtDate(booking.trip?.departureTime)}</td>
                    <td><StatusBadge status={booking.paymentStatus} /></td>
                    <td><StatusBadge status={booking.boardingStatus} /></td>
                    <td className="table-actions">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/app/bookings/${booking.bookingId}`)}>
                        Ticket
                      </Button>
                      {booking.paymentStatus !== 'REFUNDED' && booking.boardingStatus === 'NOT_BOARDED' && (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyId === booking.bookingId}
                          onClick={() => cancel(booking.bookingId)}
                        >
                          {busyId === booking.bookingId ? '…' : 'Cancel'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export function TicketPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const details = useFetch(() => api<BookingDetails>(`/bookings/${bookingId}`), [bookingId], { refreshMs: 10_000 });

  const data = details.data;

  return (
    <div className="page">
      <PageHeader
        title="Ticket"
        subtitle="Show this QR code at boarding. The driver scans it to verify your seat."
        actions={
          <div className="row-actions">
            <LiveBadge refreshing={details.refreshing} />
            <Button variant="ghost" onClick={() => navigate('/app/bookings')}>Back to bookings</Button>
          </div>
        }
      />

      {details.loading && <Loading />}
      {details.error && <ErrorBox error={details.error} onRetry={details.reload} />}

      {data && (
        <div className="ticket-layout single">
          <Card className="ticket-card">
            <div className="ticket-head">
              <div>
                <div className="brand-mark small">Z</div>
                <span className="muted">ZamBus ticket</span>
              </div>
              <StatusBadge status={data.booking.paymentStatus} />
            </div>

            <div className="ticket-body">
              <div className="qr-box">
                <QRCodeSVG value={data.booking.qrCodeData} size={190} bgColor="#ffffff" fgColor="#101828" />
              </div>
              <div className="ticket-info">
                <h2>{data.trip?.routeName ?? 'Trip'}</h2>
                <p className="muted">
                  {data.trip?.origin} → {data.trip?.destination}
                </p>
                <div className="ticket-grid">
                  <div>
                    <span className="muted">Passenger</span>
                    <strong>{data.passenger?.fullName ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="muted">Seat</span>
                    <strong>{data.booking.seatNumber}</strong>
                  </div>
                  <div>
                    <span className="muted">Departs</span>
                    <strong>{fmtDate(data.trip?.departureTime)}</strong>
                  </div>
                  <div>
                    <span className="muted">Bus</span>
                    <strong>{data.trip?.busReg ?? '—'}</strong>
                  </div>
                </div>
                <div className="chips">
                  <StatusBadge status={data.booking.boardingStatus} />
                  <Badge>{data.trip?.busModel ?? 'Bus'}</Badge>
                </div>
                <p className="muted small">
                  Booking ref: <code>{data.booking.bookingId}</code>
                </p>
              </div>
            </div>

            {data.booking.paymentStatus === 'PENDING' && (
              <Notice tone="warning" title="Payment pending">
                This ticket is not valid for boarding yet. Confirm the booking first to generate the final ticket.
              </Notice>
            )}

            {data.booking.paymentStatus === 'REFUNDED' && (
              <Notice tone="danger" title="Ticket cancelled">
                This booking has been refunded and the seat has been released. This QR code cannot be used for
                boarding.
              </Notice>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
