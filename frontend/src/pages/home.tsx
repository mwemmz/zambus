import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { fmtDate, fmtMoney, fmtDuration } from '../lib/format';
import { buildSearchParams, SearchBar, todayISO, type SearchValues } from '../components/SearchBar';
import type { BookingListItem, TripSearchResult } from '../lib/types';
import { Button, Loading } from '../components/ui';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Public feed — no auth needed to browse, exactly like the reference journey.
  const upcoming = useFetch(() => api<TripSearchResult>('/trips?limit=6'), [], { refreshMs: 30_000 });
  const bookings = useFetch(
    () => (user ? api<BookingListItem[]>('/bookings/my') : Promise.resolve([])),
    [user?.userId],
    { refreshMs: 30_000 },
  );

  const popular = useMemo(() => {
    const seen = new Set<string>();
    return (upcoming.data?.trips ?? []).filter((trip) => {
      const key = `${trip.route?.routeName ?? trip.tripId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [upcoming.data]);

  const search = (values: SearchValues) => {
    const params = buildSearchParams({ ...values, date: values.date || todayISO() });
    navigate(`/search?${params.toString()}`);
  };

  const nextTrip = (bookings.data ?? [])
    .filter((booking) => booking.trip?.departureTime && new Date(booking.trip.departureTime) > new Date())
    .sort(
      (a, b) =>
        new Date(a.trip!.departureTime!).getTime() - new Date(b.trip!.departureTime!).getTime(),
    )[0];

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow">Zambia · intercity coaches</span>
          <h1 className="hero-title">
            Book your seat in
            <br />
            <span className="hero-title-accent">three taps.</span>
          </h1>
          <p className="hero-sub">
            Compare departures from Lusaka, Livingstone, Kitwe and the Copperbelt. Hold a seat for 10
            minutes, pay with mobile money and board with a QR ticket.
          </p>
        </div>
      </section>

      <div className="hero-search-wrap">
        <SearchBar
          initial={{ from: '', to: '', date: todayISO(), pax: 1, sort: '' }}
          onSubmit={search}
        />
      </div>

      {nextTrip && (
        <section className="p-section p-section-tight">
          <div className="next-trip-banner">
            <div>
              <span className="muted small">Your next departure</span>
              <strong>
                {nextTrip.trip?.origin} → {nextTrip.trip?.destination}
              </strong>
              <span className="muted small">
                {fmtDate(nextTrip.trip?.departureTime)} · Seat {nextTrip.seatNumber}
              </span>
            </div>
            <Link className="btn btn-primary btn-md" to={`/my-trips/${nextTrip.bookingId}`}>
              Open ticket
            </Link>
          </div>
        </section>
      )}

      <section className="p-section">
        <div className="p-section-head">
          <div>
            <h2>Popular departures</h2>
            <p className="muted">Live seats and fares from the operator feeds.</p>
          </div>
          <Link className="p-section-link" to="/search">
            See all trips →
          </Link>
        </div>

        {upcoming.loading && <Loading text="Loading departures…" />}
        {upcoming.error && (
          <p className="muted small">Could not load departures: {errorMessage(upcoming.error)}</p>
        )}

        <div className="popular-grid">
          {popular.map((trip) => (
            <Link
              key={trip.tripId}
              className="popular-card"
              to={`/search?${buildSearchParams({
                from: trip.route?.origin ?? '',
                to: trip.route?.destination ?? '',
                date: trip.departureTime.slice(0, 10),
                pax: 1,
                sort: '',
              }).toString()}`}
            >
              <div className="popular-route">
                <strong>{trip.route?.origin}</strong>
                <span className="arrow">→</span>
                <strong>{trip.route?.destination}</strong>
              </div>
              <div className="muted small">{trip.route?.routeName ?? 'Intercity route'}</div>
              <div className="popular-meta">
                <span className="popular-price">{fmtMoney(trip.fareAmount)}</span>
                <span className="muted small">
                  {trip.route?.estimatedTravelTime
                    ? `${fmtDuration(trip.route.estimatedTravelTime)} · `
                    : ''}
                  {trip.remainingSeats ?? '—'} seats left
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="p-section p-section-steps">
        <h2>How it works</h2>
        <div className="how-grid">
          <div className="how-step">
            <span className="how-num">1</span>
            <h3>Search & compare</h3>
            <p className="muted">
              Filter by origin, destination and date. Every fare shown is the real seat price for that
              departure.
            </p>
          </div>
          <div className="how-step">
            <span className="how-num">2</span>
            <h3>Hold your seat</h3>
            <p className="muted">
              Pick one or more seats on the coach map. They are held for 10 minutes while you check out —
              nobody else can take them.
            </p>
          </div>
          <div className="how-step">
            <span className="how-num">3</span>
            <h3>Pay & board</h3>
            <p className="muted">
              Approve the mobile money prompt on your phone. Your QR ticket appears instantly and the driver
              scans it at the door.
            </p>
          </div>
        </div>
      </section>

      <section className="p-section p-cta">
        <div className="p-cta-inner">
          <div>
            <h2>Driving for an operator?</h2>
            <p className="muted">
              The crew app validates QR tickets, shows the passenger manifest and files emergency reports.
            </p>
          </div>
          <Button onClick={() => navigate('/login')}>Open crew app</Button>
        </div>
      </section>
    </>
  );
}
