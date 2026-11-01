import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useFetch } from '../lib/hooks';
import { api } from '../lib/api';
import { fmtDate, fmtMoney, label } from '../lib/format';
import type { Analytics, BookingListItem, Trip, TripSearchResult, User, Company, Bus, Route } from '../lib/types';
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader, Stat, StatusBadge } from '../components/ui';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'PASSENGER') return <PassengerDashboard user={user} />;
  if (user.role === 'DRIVER') return <DriverDashboard />;
  if (user.role === 'OPERATOR') return <OperatorDashboard />;
  return <AdminDashboard user={user} />;
}

function PassengerDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const bookings = useFetch(() => api<BookingListItem[]>('/bookings/my'), []);
  const trips = useFetch(() => api<TripSearchResult>('/trips?limit=5'), []);

  const list = bookings.data ?? [];
  const confirmed = list.filter((booking) => booking.paymentStatus === 'CONFIRMED').length;
  const pending = list.filter((booking) => booking.paymentStatus === 'PENDING').length;

  return (
    <div className="page">
      <PageHeader
        title={`Welcome back, ${user.fullName.split(' ')[0]}`}
        subtitle="Search for a trip, reserve a seat and confirm a mock payment to generate a QR ticket."
        actions={<Button onClick={() => navigate('/app/trips')}>Find a trip</Button>}
      />

      <div className="stat-grid">
        <Stat label="My bookings" value={bookings.loading ? '…' : list.length} hint="All time" />
        <Stat label="Confirmed" value={bookings.loading ? '…' : confirmed} tone="success" hint="Ready to board" />
        <Stat label="Pending payment" value={bookings.loading ? '…' : pending} tone="warning" hint="Seats temporarily held" />
        <Stat label="Upcoming trips" value={trips.loading ? '…' : (trips.data?.trips.length ?? 0)} tone="neutral" hint="Next departures" />
      </div>

      <div className="two-col">
        <Card
          title="Upcoming departures"
          subtitle="Live from GET /api/trips"
          actions={<Button variant="ghost" size="sm" onClick={() => navigate('/app/trips')}>View all</Button>}
        >
          {trips.loading && <Loading />}
          {trips.error && <ErrorBox error={trips.error} onRetry={trips.reload} />}
          {!trips.loading && !trips.error && (trips.data?.trips.length ?? 0) === 0 && (
            <Empty title="No trips scheduled" hint="Seed the database or create a trip as an operator." />
          )}
          <div className="stack">
            {trips.data?.trips.map((trip) => (
              <button
                type="button"
                key={trip.tripId}
                className="list-row list-row-clickable"
                onClick={() => navigate(`/app/trips/${trip.tripId}`)}
              >
                <div>
                  <strong>{trip.route?.routeName ?? 'Trip'}</strong>
                  <span className="muted">
                    {trip.route?.origin} → {trip.route?.destination} · {fmtDate(trip.departureTime)}
                  </span>
                </div>
                <div className="list-row-side">
                  <strong>{fmtMoney(trip.fareAmount)}</strong>
                  <span className="muted">{trip.remainingSeats ?? '—'} seats left</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card
          title="Recent bookings"
          subtitle="GET /api/bookings/my"
          actions={<Button variant="ghost" size="sm" onClick={() => navigate('/app/bookings')}>Manage</Button>}
        >
          {bookings.loading && <Loading />}
          {bookings.error && <ErrorBox error={bookings.error} onRetry={bookings.reload} />}
          {!bookings.loading && !bookings.error && list.length === 0 && (
            <Empty title="No bookings yet" hint="Reserve a seat to see it here." />
          )}
          <div className="stack">
            {list.slice(0, 5).map((booking) => (
              <button
                type="button"
                key={booking.bookingId}
                className="list-row list-row-clickable"
                onClick={() => navigate(`/app/bookings/${booking.bookingId}`)}
              >
                <div>
                  <strong>{booking.trip?.routeName ?? 'Booking'}</strong>
                  <span className="muted">
                    Seat {booking.seatNumber} · {fmtDate(booking.trip?.departureTime)}
                  </span>
                </div>
                <div className="list-row-side">
                  <StatusBadge status={booking.paymentStatus} />
                  <StatusBadge status={booking.boardingStatus} />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DriverDashboard() {
  const navigate = useNavigate();
  const trips = useFetch(() => api<Trip[]>('/trips/my/assigned'), []);
  const list = trips.data ?? [];

  return (
    <div className="page">
      <PageHeader
        title="Driver dashboard"
        subtitle="Your assigned trips, manifests and boarding tools."
        actions={<Button onClick={() => navigate('/app/scan')}>Scan a ticket</Button>}
      />

      <div className="stat-grid">
        <Stat label="Assigned trips" value={trips.loading ? '…' : list.length} />
        <Stat
          label="Scheduled"
          value={trips.loading ? '…' : list.filter((trip) => trip.status === 'SCHEDULED').length}
          tone="warning"
        />
        <Stat
          label="Boarding / in transit"
          value={
            trips.loading
              ? '…'
              : list.filter((trip) => trip.status === 'BOARDING' || trip.status === 'IN_TRANSIT').length
          }
          tone="success"
        />
        <Stat
          label="Completed"
          value={trips.loading ? '…' : list.filter((trip) => trip.status === 'COMPLETED').length}
          tone="neutral"
        />
      </div>

      <Card title="My trips" subtitle="GET /api/trips/my/assigned">
        {trips.loading && <Loading />}
        {trips.error && <ErrorBox error={trips.error} onRetry={trips.reload} />}
        {!trips.loading && !trips.error && list.length === 0 && (
          <Empty title="No trips assigned" hint="Ask an operator to assign you to a trip." />
        )}
        <div className="card-grid">
          {list.map((trip) => (
            <div key={trip.tripId} className="trip-card compact">
              <div className="trip-card-top">
                <div>
                  <strong>{trip.route?.routeName ?? 'Trip'}</strong>
                  <div className="muted">
                    {trip.route?.origin} → {trip.route?.destination}
                  </div>
                </div>
                <StatusBadge status={trip.status} />
              </div>
              <div className="trip-meta">
                <span>{fmtDate(trip.departureTime)}</span>
                <span>{trip.bus?.registrationNumber ?? 'No bus'}</span>
                <span>{fmtMoney(trip.fareAmount)}</span>
              </div>
              <div className="card-actions">
                <Button size="sm" onClick={() => navigate(`/app/manifest/${trip.tripId}`)}>
                  Manifest
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/app/scan')}>
                  Scan
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OperatorDashboard() {
  const navigate = useNavigate();
  const analytics = useFetch(() => api<Analytics>('/admin/analytics'), []);

  return (
    <div className="page">
      <PageHeader
        title="Operator dashboard"
        subtitle="Company performance and fleet operations."
        actions={<Button onClick={() => navigate('/app/operator')}>Open operator console</Button>}
      />

      {analytics.loading && <Loading />}
      {analytics.error && <ErrorBox error={analytics.error} onRetry={analytics.reload} />}
      {analytics.data && !analytics.data.hasCompany && (
        <Card title="Register your company" subtitle="An admin must approve it before you can add buses and routes.">
          <Button onClick={() => navigate('/app/operator')}>Register company</Button>
        </Card>
      )}

      {analytics.data && (
        <>
          <div className="stat-grid">
            <Stat label="Revenue" value={fmtMoney(analytics.data.totalRevenue)} tone="success" />
            <Stat label="Confirmed bookings" value={analytics.data.totalBookings} />
            <Stat label="Buses" value={analytics.data.totalBuses ?? 0} />
            <Stat label="Routes" value={analytics.data.totalRoutes ?? 0} />
          </div>
          <div className="two-col">
            <Card title="Commission" subtitle="Platform commission is applied to confirmed bookings.">
              <div className="commission-row">
                <div>
                  <span className="muted">Commission rate</span>
                  <strong>{(analytics.data.commissionRate * 100).toFixed(1)}%</strong>
                </div>
                <div>
                  <span className="muted">Commission</span>
                  <strong>{fmtMoney(analytics.data.commissionAmount)}</strong>
                </div>
                <div>
                  <span className="muted">Net payout</span>
                  <strong>{fmtMoney(analytics.data.netPayout)}</strong>
                </div>
              </div>
            </Card>
            <Card title="Quick actions">
              <div className="stack-inline">
                <Button onClick={() => navigate('/app/operator')}>Manage fleet</Button>
                <Button variant="secondary" onClick={() => navigate('/app/operator')}>Schedule trips</Button>
                <Button variant="ghost" onClick={() => navigate('/app/analytics')}>Full analytics</Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function AdminDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const data = useFetch(
    async () => {
      const [analytics, companies, buses, routes] = await Promise.all([
        api<Analytics>('/admin/analytics'),
        api<Company[]>('/admin/companies/pending'),
        api<Bus[]>('/admin/buses?status=PENDING'),
        api<Route[]>('/admin/routes?status=PENDING'),
      ]);
      return { analytics, companies, buses, routes };
    },
    [],
  );

  const pendingTotal =
    (data.data?.companies.length ?? 0) + (data.data?.buses.length ?? 0) + (data.data?.routes.length ?? 0);

  return (
    <div className="page">
      <PageHeader
        title={`Admin dashboard`}
        subtitle={`Signed in as ${user.fullName}. Platform-wide view.`}
        actions={<Button onClick={() => navigate('/app/admin')}>Open admin console</Button>}
      />

      {data.loading && <Loading />}
      {data.error && <ErrorBox error={data.error} onRetry={data.reload} />}

      {data.data && (
        <>
          <div className="stat-grid">
            <Stat label="Users" value={data.data.analytics.totalUsers} />
            <Stat label="Operators" value={data.data.analytics.totalOperators} />
            <Stat label="Platform revenue" value={fmtMoney(data.data.analytics.totalRevenue)} tone="success" />
            <Stat label="Pending approvals" value={pendingTotal} tone="warning" hint="Companies + buses + routes" />
          </div>

          <div className="two-col">
            <Card title="Pending approvals" subtitle="Approve or reject in the admin console.">
              <div className="stack">
                <div className="list-row">
                  <span>Companies</span>
                  <Badge tone={data.data.companies.length ? 'warning' : 'success'}>{data.data.companies.length}</Badge>
                </div>
                <div className="list-row">
                  <span>Buses</span>
                  <Badge tone={data.data.buses.length ? 'warning' : 'success'}>{data.data.buses.length}</Badge>
                </div>
                <div className="list-row">
                  <span>Routes</span>
                  <Badge tone={data.data.routes.length ? 'warning' : 'success'}>{data.data.routes.length}</Badge>
                </div>
              </div>
              <div className="card-actions">
                <Button onClick={() => navigate('/app/admin')}>Review approvals</Button>
              </div>
            </Card>

            <Card title="Platform commission" subtitle="GET /api/admin/analytics">
              <div className="commission-row">
                <div>
                  <span className="muted">Rate</span>
                  <strong>{(data.data.analytics.commissionRate * 100).toFixed(1)}%</strong>
                </div>
                <div>
                  <span className="muted">Collected</span>
                  <strong>{fmtMoney(data.data.analytics.commissionAmount)}</strong>
                </div>
                <div>
                  <span className="muted">Payouts</span>
                  <strong>{fmtMoney(data.data.analytics.netPayout)}</strong>
                </div>
              </div>
              <div className="card-actions">
                <Button variant="ghost" onClick={() => navigate('/app/analytics')}>View analytics</Button>
                <Button variant="ghost" onClick={() => navigate('/app/admin')}>Settings</Button>
              </div>
            </Card>
          </div>

          <Card title="Trip status mix" subtitle="Platform-wide">
            <div className="stack-inline">
              <Badge tone="warning">{label('SCHEDULED')} · {data.data.analytics.totalActiveTrips} active</Badge>
              <Badge tone="success">{data.data.analytics.totalBookings} confirmed bookings</Badge>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
