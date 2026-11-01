import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { fmtDate, fmtMoney } from '../lib/format';
import type { BookingDetails, BookingListItem } from '../lib/types';
import {
  Badge,
  Button,
  Card,
  CopyButton,
  Empty,
  ErrorBox,
  LiveBadge,
  Loading,
  Notice,
  StatusBadge,
  Tabs,
} from '../components/ui';

export function MyTripsPage() {
  const navigate = useNavigate();
  const bookings = useFetch(() => api<BookingListItem[]>('/bookings/my'), [], { refreshMs: 15_000 });
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = bookings.data ?? [];
  const now = Date.now();

  const { upcoming, past } = useMemo(() => {
    const upcomingList: BookingListItem[] = [];
    const pastList: BookingListItem[] = [];
    list.forEach((booking) => {
      const departure = booking.trip?.departureTime ? new Date(booking.trip.departureTime).getTime() : 0;
      if (departure >= now) upcomingList.push(booking);
      else pastList.push(booking);
    });
    upcomingList.sort(
      (a, b) =>
        new Date(a.trip?.departureTime ?? 0).getTime() - new Date(b.trip?.departureTime ?? 0).getTime(),
    );
    pastList.sort(
      (a, b) =>
        new Date(b.trip?.departureTime ?? 0).getTime() - new Date(a.trip?.departureTime ?? 0).getTime(),
    );
    return { upcoming: upcomingList, past: pastList };
  }, [list, now]);

  const cancel = async (bookingId: string) => {
    if (!window.confirm('Cancel this booking? The seat goes back on sale and the payment is refunded.'))
      return;
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

  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="p-section">
      <div className="p-section-head">
        <div>
          <h1 className="search-title">My trips</h1>
          <p className="muted small">Tickets, boarding status and seat details.</p>
        </div>
        <div className="row-actions">
          <LiveBadge refreshing={bookings.refreshing} />
          <Button onClick={() => navigate('/search')}>Find a trip</Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { id: 'past', label: 'Past', count: past.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {error && (
        <Notice tone="danger" title="Action failed">
          {error}
        </Notice>
      )}

      {bookings.loading && <Loading />}
      {bookings.error && <ErrorBox error={bookings.error} onRetry={bookings.reload} />}

      {!bookings.loading && !bookings.error && visible.length === 0 && (
        <Empty
          title={tab === 'upcoming' ? 'No upcoming trips' : 'No past trips'}
          hint={tab === 'upcoming' ? 'Search for a departure and hold a seat.' : 'Completed trips show up here.'}
          action={tab === 'upcoming' ? <Button onClick={() => navigate('/search')}>Find a trip</Button> : undefined}
        />
      )}

      <div className="mytrips-list">
        {visible.map((booking) => (
          <article key={booking.bookingId} className="mytrip-card">
            <div className="mytrip-main">
              <div className="mytrip-route">
                <strong>{booking.trip?.origin ?? '—'}</strong>
                <span className="arrow">→</span>
                <strong>{booking.trip?.destination ?? '—'}</strong>
              </div>
              <div className="muted small">{booking.trip?.routeName ?? 'Intercity'}</div>
              <div className="mytrip-meta">
                <span>
                  <span className="muted small">Departs</span>
                  <strong>{fmtDate(booking.trip?.departureTime)}</strong>
                </span>
                <span>
                  <span className="muted small">Seat</span>
                  <strong>{booking.seatNumber}</strong>
                </span>
                <span>
                  <span className="muted small">Fare</span>
                  <strong>{fmtMoney(booking.trip?.fareAmount)}</strong>
                </span>
              </div>
            </div>

            <div className="mytrip-side">
              <div className="chips">
                <StatusBadge status={booking.paymentStatus} />
                <StatusBadge status={booking.boardingStatus} />
              </div>
              <div className="row-actions">
                <Link className="btn btn-primary btn-sm" to={`/my-trips/${booking.bookingId}`}>
                  View ticket
                </Link>
                {booking.paymentStatus !== 'REFUNDED' && booking.boardingStatus === 'NOT_BOARDED' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === booking.bookingId}
                    onClick={() => cancel(booking.bookingId)}
                  >
                    {busyId === booking.bookingId ? '…' : 'Cancel'}
                  </Button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PassengerTicketPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const details = useFetch(() => api<BookingDetails>(`/bookings/${bookingId}`), [bookingId], {
    refreshMs: 15_000,
  });
  const data = details.data;
  const [validatedPopup, setValidatedPopup] = useState(false);
  const previousBoardingStatus = useRef<string | undefined>();

  // Projector mode: the QR fills the screen so a driver can scan it from a
  // distance (back of the coach, or projected on a wall).
  const [projector, setProjector] = useState(false);

  useEffect(() => {
    const status = data?.booking.boardingStatus;
    if (status && status !== 'NOT_BOARDED' && previousBoardingStatus.current === 'NOT_BOARDED') {
      setValidatedPopup(true);
    }
    if (status) previousBoardingStatus.current = status;
  }, [data?.booking.boardingStatus]);

  useEffect(() => {
    if (!projector) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProjector(false);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [projector]);

  return (
    <div className="p-section">
      <div className="p-section-head">
        <div>
          <Link className="p-section-link" to="/my-trips">
            ← My trips
          </Link>
          <h1 className="search-title">Your ticket</h1>
        </div>
        <LiveBadge refreshing={details.refreshing} />
      </div>

      {details.loading && <Loading />}
      {details.error && <ErrorBox error={details.error} onRetry={details.reload} />}

      {data && (
        <div className="ticket-layout">
          <Card className="ticket-card">
            <div className="ticket-head">
              <div>
                <div className="brand-mark small">Z</div>
                <span className="muted">ZamBus ticket</span>
              </div>
              <StatusBadge status={data.booking.paymentStatus} />
            </div>

            <div className="ticket-body">
              <div className="ticket-qr-zone">
                <div className="qr-box">
                  <QRCodeSVG
                    value={data.booking.qrCodeData}
                    size={360}
                    bgColor="#ffffff"
                    fgColor="#101828"
                    level="M"
                    marginSize={2}
                  />
                </div>

                <div className="ticket-qr-caption">
                  <strong>Scan to board</strong>
                  <span className="muted small">
                    Seat {data.booking.seatNumber} · {data.trip?.origin} → {data.trip?.destination}
                  </span>
                </div>

                <Button variant="ghost" size="sm" onClick={() => setProjector(true)}>
                  Show full screen
                </Button>
              </div>

              <div className="ticket-perf" aria-hidden="true" />

              <div className="ticket-info">
                <div className="ticket-route">
                  <h2>{data.trip?.routeName ?? 'Trip'}</h2>
                  <p className="muted">
                    {data.trip?.origin} → {data.trip?.destination}
                  </p>
                </div>

                <div className="ticket-grid">
                  <div>
                    <span className="muted">Passenger</span>
                    <strong>{data.passenger?.fullName ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="muted">Seat</span>
                    <strong className="ticket-seat">{data.booking.seatNumber}</strong>
                  </div>
                  <div>
                    <span className="muted">Departs</span>
                    <strong>{fmtDate(data.trip?.departureTime)}</strong>
                  </div>
                  <div>
                    <span className="muted">Bus</span>
                    <strong>{data.trip?.busReg ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="muted">Boarding</span>
                    <StatusBadge status={data.booking.boardingStatus} />
                  </div>
                  <div>
                    <span className="muted">Fare</span>
                    <strong>{fmtMoney(data.trip?.fareAmount)}</strong>
                  </div>
                </div>

                <div className="ticket-ref">
                  <span className="muted small">
                    Booking ref: <code>{data.booking.bookingId}</code>
                  </span>
                  <CopyButton text={data.booking.bookingId} label="Copy" />
                </div>
              </div>
            </div>

            {data.booking.paymentStatus === 'PENDING' && (
              <Notice tone="warning" title="Payment pending">
                This ticket is not valid for boarding yet. Finish the payment to generate the final ticket.
              </Notice>
            )}

            {data.booking.paymentStatus === 'REFUNDED' && (
              <Notice tone="danger" title="Ticket cancelled">
                This booking has been refunded and the seat released. This QR code cannot be used for
                boarding.
              </Notice>
            )}
          </Card>

          {projector && (
            <div
              className="qr-projector"
              role="dialog"
              aria-modal="true"
              aria-label="Ticket QR code, full screen"
              onClick={() => setProjector(false)}
            >
              <div className="qr-projector-inner">
                <QRCodeSVG
                  value={data.booking.qrCodeData}
                  size={1024}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  marginSize={4}
                />
                <div className="qr-projector-meta">
                  <strong>
                    {data.trip?.origin} → {data.trip?.destination}
                  </strong>
                  <span>
                    Seat {data.booking.seatNumber} · {data.passenger?.fullName ?? 'Passenger'} ·{' '}
                    {fmtDate(data.trip?.departureTime)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="qr-projector-close"
                onClick={() => setProjector(false)}
                aria-label="Close full screen"
              >
                ✕
              </button>
            </div>
          )}

          <div className="ticket-aside">
            <Card title="At the door">
              <ol className="ticket-steps">
                <li>Have this screen ready when the coach arrives.</li>
                <li>The driver scans the QR code with the crew app.</li>
                <li>Your boarding status flips to Boarded — the seat is yours.</li>
              </ol>
            </Card>
            <Card title="Before you travel">
              <ul className="ticket-steps">
                <li>Arrive at the terminal 20 minutes before departure.</li>
                <li>Carry an ID document matching the passenger name.</li>
                <li>Cancellations are free until the coach departs.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {validatedPopup && (
        <div className="validation-modal-backdrop" role="presentation">
          <div
            className="validation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="validated-title"
          >
            <div className="validation-modal-mark">✓</div>
            <h2 id="validated-title">Ticket validated</h2>
            <p>Your QR ticket was scanned successfully. You are confirmed as boarded.</p>
            <Button onClick={() => setValidatedPopup(false)}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
