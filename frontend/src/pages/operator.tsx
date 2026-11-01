import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { fmtDate, fmtMoney, fromDateTimeLocal, label, splitList, toDateTimeLocal } from '../lib/format';
import type { Analytics, Bus, Company, Route, Trip, TripSearchResult, User } from '../lib/types';
import { AnalyticsPanel } from './analytics';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  LiveBadge,
  Loading,
  Notice,
  PageHeader,
  Select,
  Stat,
  StatusBadge,
  Tabs,
  Textarea,
} from '../components/ui';

type TabId = 'company' | 'fleet' | 'routes' | 'trips' | 'analytics';

export function OperatorPage() {
  const [tab, setTab] = useState<TabId>('company');

  return (
    <div className="page">
      <PageHeader
        title="Operator console"
        subtitle="Register your company, manage buses and routes, and schedule trips."
      />
      <Tabs
        tabs={[
          { id: 'company', label: 'Company' },
          { id: 'fleet', label: 'Fleet' },
          { id: 'routes', label: 'Routes' },
          { id: 'trips', label: 'Trips' },
          { id: 'analytics', label: 'Analytics' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'company' && <CompanyTab />}
      {tab === 'fleet' && <FleetTab />}
      {tab === 'routes' && <RoutesTab />}
      {tab === 'trips' && <TripsTab />}
      {tab === 'analytics' && <OperatorAnalyticsTab />}
    </div>
  );
}

function CompanyTab() {
  const company = useFetch(() => api<Company | null>('/operators/my-company'), [], { refreshMs: 15_000 });
  const [form, setForm] = useState({
    companyName: '',
    registrationNumber: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await api('/operators/register-company', {
        method: 'POST',
        body: {
          companyName: form.companyName.trim(),
          registrationNumber: form.registrationNumber.trim() || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
        },
      });
      setSuccess('Company registered and sent to admin for approval.');
      company.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {company.loading && <Loading />}
      {company.error && <ErrorBox error={company.error} onRetry={company.reload} />}
      {error && <Notice tone="danger" title="Could not register company">{error}</Notice>}
      {success && <Notice tone="success" title="Registered">{success}</Notice>}

      {company.data && (
        <Card
          title="My company"
          subtitle="GET /api/operators/my-company"
          actions={<LiveBadge refreshing={company.refreshing} />}
        >
          <div className="company-card">
            <div>
              <h2>{company.data.companyName}</h2>
              <p className="muted">Registration: {company.data.registrationNumber || '—'}</p>
            </div>
            <Badge tone={company.data.isApproved ? 'success' : 'warning'}>
              {company.data.isApproved ? 'Approved' : 'Pending approval'}
            </Badge>
          </div>
          <div className="summary-grid">
            <div>
              <span className="muted">Contact email</span>
              <strong>{company.data.contactEmail || '—'}</strong>
            </div>
            <div>
              <span className="muted">Contact phone</span>
              <strong>{company.data.contactPhone || '—'}</strong>
            </div>
          </div>
          {!company.data.isApproved && (
            <Notice tone="warning">
              An admin must approve this company before buses and routes can be scheduled.
            </Notice>
          )}
        </Card>
      )}

      {!company.loading && !company.error && company.data === null && (
        <Card
          title="Register a bus company"
          subtitle="Only one company per operator. It starts unapproved."
        >
          <form className="form-grid" onSubmit={submit}>
            <Field label="Company name" required>
              <Input
                value={form.companyName}
                onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                required
                minLength={2}
              />
            </Field>
            <Field label="Registration number">
              <Input
                value={form.registrationNumber}
                onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })}
              />
            </Field>
            <Field label="Contact email">
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
              />
            </Field>
            <Field label="Contact phone">
              <Input
                value={form.contactPhone}
                onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
              />
            </Field>
            <div className="form-actions">
              <Button type="submit" disabled={busy}>
                {busy ? 'Registering…' : 'Register company'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

function FleetTab() {
  const buses = useFetch(() => api<Bus[]>('/buses'), [], { refreshMs: 15_000 });
  const [form, setForm] = useState({
    registrationNumber: '',
    model: '',
    seatCapacity: '40',
    amenities: 'WiFi, USB Charging',
    maintenanceStatus: 'OPERATIONAL',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await api('/buses', {
        method: 'POST',
        body: {
          registrationNumber: form.registrationNumber.trim(),
          model: form.model.trim(),
          seatCapacity: Number(form.seatCapacity),
          amenities: splitList(form.amenities),
          maintenanceStatus: form.maintenanceStatus,
        },
      });
      setSuccess('Bus registered. It is pending admin approval.');
      setForm({ ...form, registrationNumber: '', model: '' });
      buses.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const updateMaintenance = async (busId: string, maintenanceStatus: string) => {
    setError(null);
    try {
      await api(`/buses/${busId}`, { method: 'PUT', body: { maintenanceStatus } });
      buses.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (busId: string) => {
    if (!window.confirm('Delete this bus?')) return;
    setError(null);
    try {
      await api(`/buses/${busId}`, { method: 'DELETE' });
      buses.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      {error && <Notice tone="danger" title="Action failed">{error}</Notice>}
      {success && <Notice tone="success" title="Saved">{success}</Notice>}

      <Card title="Register a bus" subtitle="New buses need admin approval before they can be scheduled.">
        <form className="form-grid" onSubmit={submit}>
          <Field label="Registration number" required>
            <Input
              value={form.registrationNumber}
              onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })}
              placeholder="ZB-BUS-005"
              required
            />
          </Field>
          <Field label="Model" required>
            <Input
              value={form.model}
              onChange={(event) => setForm({ ...form, model: event.target.value })}
              placeholder="Toyota Coaster"
              required
            />
          </Field>
          <Field label="Seat capacity" required>
            <Input
              type="number"
              min={1}
              value={form.seatCapacity}
              onChange={(event) => setForm({ ...form, seatCapacity: event.target.value })}
              required
            />
          </Field>
          <Field label="Maintenance status">
            <Select
              value={form.maintenanceStatus}
              onChange={(event) => setForm({ ...form, maintenanceStatus: event.target.value })}
            >
              <option value="OPERATIONAL">Operational</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OUT_OF_SERVICE">Out of service</option>
            </Select>
          </Field>
          <Field label="Amenities" hint="Comma-separated">
            <Input
              value={form.amenities}
              onChange={(event) => setForm({ ...form, amenities: event.target.value })}
            />
          </Field>
          <div className="form-actions">
            <Button type="submit" disabled={busy}>
              {busy ? 'Registering…' : 'Register bus'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Fleet"
        subtitle="GET /api/buses"
        actions={<LiveBadge refreshing={buses.refreshing} />}
      >
        {buses.loading && <Loading />}
        {buses.error && <ErrorBox error={buses.error} onRetry={buses.reload} />}
        {!buses.loading && !buses.error && (buses.data?.length ?? 0) === 0 && (
          <Empty title="No buses yet" hint="Register your first bus above." />
        )}
        {buses.data && buses.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Capacity</th>
                  <th>Approval</th>
                  <th>Maintenance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {buses.data.map((bus) => (
                  <tr key={bus.busId}>
                    <td>
                      <strong>{bus.registrationNumber}</strong>
                      <div className="muted small">{bus.model}</div>
                      {bus.amenities.length > 0 && (
                        <div className="chips">{bus.amenities.map((amenity) => <Badge key={amenity}>{amenity}</Badge>)}</div>
                      )}
                    </td>
                    <td>{bus.seatCapacity}</td>
                    <td>
                      <StatusBadge status={bus.approvalStatus} />
                      {bus.rejectionReason && <div className="muted small">{bus.rejectionReason}</div>}
                    </td>
                    <td>
                      <Select
                        value={bus.maintenanceStatus}
                        onChange={(event) => updateMaintenance(bus.busId, event.target.value)}
                      >
                        <option value="OPERATIONAL">Operational</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="OUT_OF_SERVICE">Out of service</option>
                      </Select>
                    </td>
                    <td className="table-actions">
                      <Button size="sm" variant="danger" onClick={() => remove(bus.busId)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function RoutesTab() {
  const routes = useFetch(() => api<Route[]>('/routes'), [], { refreshMs: 15_000 });
  const [form, setForm] = useState({
    routeName: '',
    origin: '',
    destination: '',
    intermediateStops: '',
    estimatedTravelTime: '360',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await api('/routes', {
        method: 'POST',
        body: {
          routeName: form.routeName.trim(),
          origin: form.origin.trim(),
          destination: form.destination.trim(),
          intermediateStops: splitList(form.intermediateStops),
          estimatedTravelTime: Number(form.estimatedTravelTime),
        },
      });
      setSuccess('Route created and sent for admin approval.');
      setForm({ ...form, routeName: '', origin: '', destination: '', intermediateStops: '' });
      routes.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (routeId: string) => {
    if (!window.confirm('Delete this route?')) return;
    setError(null);
    try {
      await api(`/routes/${routeId}`, { method: 'DELETE' });
      routes.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      {error && <Notice tone="danger" title="Action failed">{error}</Notice>}
      {success && <Notice tone="success" title="Saved">{success}</Notice>}

      <Card title="Create a route" subtitle="New routes need admin approval before trips can use them.">
        <form className="form-grid" onSubmit={submit}>
          <Field label="Route name" required>
            <Input
              value={form.routeName}
              onChange={(event) => setForm({ ...form, routeName: event.target.value })}
              placeholder="Lusaka - Kitwe"
              required
              minLength={3}
            />
          </Field>
          <Field label="Origin" required>
            <Input
              value={form.origin}
              onChange={(event) => setForm({ ...form, origin: event.target.value })}
              required
            />
          </Field>
          <Field label="Destination" required>
            <Input
              value={form.destination}
              onChange={(event) => setForm({ ...form, destination: event.target.value })}
              required
            />
          </Field>
          <Field label="Travel time (minutes)">
            <Input
              type="number"
              min={1}
              value={form.estimatedTravelTime}
              onChange={(event) => setForm({ ...form, estimatedTravelTime: event.target.value })}
            />
          </Field>
          <Field label="Intermediate stops" hint="Comma-separated">
            <Input
              value={form.intermediateStops}
              onChange={(event) => setForm({ ...form, intermediateStops: event.target.value })}
              placeholder="Kabwe, Kapiri Mposhi"
            />
          </Field>
          <div className="form-actions">
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create route'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Routes"
        subtitle="GET /api/routes"
        actions={<LiveBadge refreshing={routes.refreshing} />}
      >
        {routes.loading && <Loading />}
        {routes.error && <ErrorBox error={routes.error} onRetry={routes.reload} />}
        {!routes.loading && !routes.error && (routes.data?.length ?? 0) === 0 && (
          <Empty title="No routes yet" hint="Create your first route above." />
        )}
        {routes.data && routes.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Stops</th>
                  <th>Travel time</th>
                  <th>Approval</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.data.map((route) => (
                  <tr key={route.routeId}>
                    <td>
                      <strong>{route.routeName}</strong>
                      <div className="muted small">
                        {route.origin} → {route.destination}
                        {route.company?.companyName ? ` · ${route.company.companyName}` : ''}
                      </div>
                    </td>
                    <td>{route.intermediateStops.length > 0 ? route.intermediateStops.join(', ') : '—'}</td>
                    <td>{route.estimatedTravelTime ? `${route.estimatedTravelTime} min` : '—'}</td>
                    <td>
                      <StatusBadge status={route.approvalStatus} />
                      {route.rejectionReason && <div className="muted small">{route.rejectionReason}</div>}
                    </td>
                    <td className="table-actions">
                      <Button size="sm" variant="danger" onClick={() => remove(route.routeId)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function TripsTab() {
  const navigate = useNavigate();
  const data = useFetch(
    async () => {
      const [company, buses, routes, drivers, trips] = await Promise.all([
        api<Company | null>('/operators/my-company'),
        api<Bus[]>('/buses'),
        api<Route[]>('/routes'),
        api<User[]>('/trips/drivers'),
        api<TripSearchResult>('/trips?limit=50&includePast=true'),
      ]);
      return { company, buses, routes, drivers, trips };
    },
    [],
    { refreshMs: 10_000 },
  );

  const [form, setForm] = useState({
    routeId: '',
    busId: '',
    driverId: '',
    departureTime: toDateTimeLocal(new Date(Date.now() + 24 * 3600 * 1000).toISOString()),
    estimatedArrival: toDateTimeLocal(new Date(Date.now() + 30 * 3600 * 1000).toISOString()),
    fareAmount: '150',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyTripId, setBusyTripId] = useState<string | null>(null);

  const companyId = data.data?.company?.companyId;
  const buses = (data.data?.buses ?? []).filter((bus) => bus.approvalStatus === 'APPROVED');
  const routes = (data.data?.routes ?? []).filter(
    (route) => route.approvalStatus === 'APPROVED' && (!companyId || route.companyId === companyId),
  );
  const drivers = data.data?.drivers ?? [];
  const trips = data.data?.trips.trips ?? [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await api('/trips', {
        method: 'POST',
        body: {
          routeId: form.routeId,
          busId: form.busId,
          driverId: form.driverId,
          departureTime: fromDateTimeLocal(form.departureTime),
          estimatedArrival: fromDateTimeLocal(form.estimatedArrival),
          fareAmount: Number(form.fareAmount),
        },
      });
      setSuccess('Trip scheduled.');
      data.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const tripAction = async (tripId: string, action: 'open' | 'close' | 'cancel') => {
    setBusyTripId(tripId);
    setError(null);
    setSuccess(null);
    try {
      await api(`/trips/${tripId}/${action}`, { method: 'POST' });
      setSuccess(`Trip ${action === 'open' ? 'opened for boarding' : action === 'close' ? 'closed' : 'cancelled'}.`);
      data.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyTripId(null);
    }
  };

  const delayTrip = async (trip: Trip) => {
    const next = window.prompt(
      'New departure time (YYYY-MM-DDTHH:mm)',
      toDateTimeLocal(trip.departureTime),
    );
    if (!next) return;
    setBusyTripId(trip.tripId);
    setError(null);
    setSuccess(null);
    try {
      await api(`/trips/${trip.tripId}/delay`, {
        method: 'POST',
        body: { newDepartureTime: fromDateTimeLocal(next) },
      });
      setSuccess('Trip departure updated.');
      data.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyTripId(null);
    }
  };

  return (
    <>
      {error && <Notice tone="danger" title="Action failed">{error}</Notice>}
      {success && <Notice tone="success" title="Saved">{success}</Notice>}

      <Card
        title="Schedule a trip"
        subtitle="Only approved buses and routes from your company can be scheduled."
      >
        {data.loading && <Loading />}
        {data.error && <ErrorBox error={data.error} onRetry={data.reload} />}
        {!data.loading && !data.error && (!companyId || buses.length === 0 || routes.length === 0) && (
          <Notice tone="warning">
            You need an approved company, at least one approved bus and one approved route before
            scheduling a trip. Ask an admin to approve pending items.
          </Notice>
        )}
        <form className="form-grid" onSubmit={submit}>
          <Field label="Route" required>
            <Select
              value={form.routeId}
              onChange={(event) => setForm({ ...form, routeId: event.target.value })}
              required
            >
              <option value="">Select route</option>
              {routes.map((route) => (
                <option key={route.routeId} value={route.routeId}>
                  {route.routeName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bus" required>
            <Select
              value={form.busId}
              onChange={(event) => setForm({ ...form, busId: event.target.value })}
              required
            >
              <option value="">Select bus</option>
              {buses.map((bus) => (
                <option key={bus.busId} value={bus.busId}>
                  {bus.registrationNumber} · {bus.model} ({bus.seatCapacity} seats)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Driver" required>
            <Select
              value={form.driverId}
              onChange={(event) => setForm({ ...form, driverId: event.target.value })}
              required
            >
              <option value="">Select driver</option>
              {drivers.map((driver) => (
                <option key={driver.userId} value={driver.userId}>
                  {driver.fullName} · {driver.phoneNumber}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fare (ZMW)" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.fareAmount}
              onChange={(event) => setForm({ ...form, fareAmount: event.target.value })}
              required
            />
          </Field>
          <Field label="Departure" required>
            <Input
              type="datetime-local"
              value={form.departureTime}
              onChange={(event) => setForm({ ...form, departureTime: event.target.value })}
              required
            />
          </Field>
          <Field label="Estimated arrival" required>
            <Input
              type="datetime-local"
              value={form.estimatedArrival}
              onChange={(event) => setForm({ ...form, estimatedArrival: event.target.value })}
              required
            />
          </Field>
          <div className="form-actions">
            <Button type="submit" disabled={busy}>
              {busy ? 'Scheduling…' : 'Schedule trip'}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Trips"
        subtitle="GET /api/trips"
        actions={<LiveBadge refreshing={data.refreshing} />}
      >
        {data.loading && <Loading />}
        {data.error && <ErrorBox error={data.error} onRetry={data.reload} />}
        {!data.loading && !data.error && trips.length === 0 && (
          <Empty title="No trips" hint="Schedule a trip above." />
        )}
        {trips.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Bus / Driver</th>
                  <th>Fare</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.tripId}>
                    <td>
                      <strong>{trip.route?.routeName ?? '—'}</strong>
                      <div className="muted small">
                        {trip.route?.origin} → {trip.route?.destination}
                      </div>
                    </td>
                    <td>{fmtDate(trip.departureTime)}</td>
                    <td>
                      {trip.bus?.registrationNumber ?? '—'}
                      <div className="muted small">{trip.driver?.fullName ?? '—'}</div>
                    </td>
                    <td>{fmtMoney(trip.fareAmount)}</td>
                    <td><StatusBadge status={trip.status} /></td>
                    <td className="table-actions">
                      {trip.status === 'SCHEDULED' && (
                        <Button
                          size="sm"
                          variant="success"
                          disabled={busyTripId === trip.tripId}
                          onClick={() => tripAction(trip.tripId, 'open')}
                        >
                          Open
                        </Button>
                      )}
                      {trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyTripId === trip.tripId}
                          onClick={() => tripAction(trip.tripId, 'close')}
                        >
                          Close
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => delayTrip(trip)}>
                        Delay
                      </Button>
                      {trip.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busyTripId === trip.tripId}
                          onClick={() => tripAction(trip.tripId, 'cancel')}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/app/manifest/${trip.tripId}`)}
                      >
                        Manifest
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function OperatorAnalyticsTab() {
  const analytics = useFetch(() => api<Analytics>('/admin/analytics'), [], { refreshMs: 15_000 });

  return (
    <>
      {analytics.loading && <Loading />}
      {analytics.error && <ErrorBox error={analytics.error} onRetry={analytics.reload} />}
      {analytics.data && (
        <>
          <div className="stat-grid">
            <Stat label="My buses" value={analytics.data.totalBuses ?? 0} />
            <Stat label="My routes" value={analytics.data.totalRoutes ?? 0} />
            <Stat label="Confirmed bookings" value={analytics.data.totalBookings} tone="success" />
            <Stat label="Revenue" value={fmtMoney(analytics.data.totalRevenue)} tone="success" />
          </div>
          <AnalyticsPanel data={analytics.data} />
        </>
      )}
    </>
  );
}
