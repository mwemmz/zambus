import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { fmtDate, fmtMoney, label } from '../lib/format';
import type { Analytics, Bus, Company, EmergencyReport, PaginatedUsers, PlatformSettings, Role, Route, User } from '../lib/types';
import { AnalyticsPanel } from './analytics';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  Loading,
  Notice,
  PageHeader,
  Select,
  Stat,
  StatusBadge,
  Tabs,
  Textarea,
} from '../components/ui';

type TabId = 'approvals' | 'users' | 'settings' | 'analytics' | 'reports';

export function AdminPage() {
  const [tab, setTab] = useState<TabId>('approvals');

  return (
    <div className="page">
      <PageHeader
        title="Admin console"
        subtitle="Approve operators, buses and routes; manage users and platform settings."
      />
      <Tabs
        tabs={[
          { id: 'approvals', label: 'Approvals' },
          { id: 'users', label: 'Users' },
          { id: 'settings', label: 'Settings' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'reports', label: 'Emergency reports' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'approvals' && <ApprovalsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'analytics' && <AdminAnalyticsTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}

function ApprovalsTab() {
  const data = useFetch(
    async () => {
      const [companies, buses, routes] = await Promise.all([
        api<Company[]>('/admin/companies/pending'),
        api<Bus[]>('/admin/buses?status=PENDING'),
        api<Route[]>('/admin/routes?status=PENDING'),
      ]);
      return { companies, buses, routes };
    },
    [],
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const approve = async (kind: 'companies' | 'buses' | 'routes', id: string) => {
    setBusyKey(`${kind}-${id}`);
    setError(null);
    setSuccess(null);
    try {
      await api(`/admin/${kind}/${id}/approve`, { method: 'POST' });
      setSuccess('Approved.');
      data.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const reject = async (kind: 'companies' | 'buses' | 'routes', id: string) => {
    const reason = window.prompt('Rejection reason (optional)');
    if (reason === null) return;
    setBusyKey(`${kind}-${id}`);
    setError(null);
    setSuccess(null);
    try {
      await api(`/admin/${kind}/${id}/reject`, {
        method: 'POST',
        body: { reason: reason.trim() || undefined },
      });
      setSuccess('Rejected.');
      data.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const companies = data.data?.companies ?? [];
  const buses = data.data?.buses ?? [];
  const routes = data.data?.routes ?? [];
  const total = companies.length + buses.length + routes.length;

  return (
    <>
      {error && <Notice tone="danger" title="Action failed">{error}</Notice>}
      {success && <Notice tone="success" title="Updated">{success}</Notice>}
      {data.loading && <Loading />}
      {data.error && <ErrorBox error={data.error} onRetry={data.reload} />}

      {data.data && (
        <>
          <div className="stat-grid">
            <Stat label="Pending companies" value={companies.length} tone="warning" />
            <Stat label="Pending buses" value={buses.length} tone="warning" />
            <Stat label="Pending routes" value={routes.length} tone="warning" />
            <Stat label="Total approvals" value={total} tone="neutral" />
          </div>

          <Card title="Pending companies" subtitle="GET /api/admin/companies/pending">
            {companies.length === 0 && <Empty title="No pending companies" />}
            {companies.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Operator</th>
                      <th>Contact</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.companyId}>
                        <td>
                          <strong>{company.companyName}</strong>
                          <div className="muted small">{company.registrationNumber || 'No reg. number'}</div>
                        </td>
                        <td>
                          {company.operator?.fullName ?? '—'}
                          <div className="muted small">{company.operator?.email ?? ''}</div>
                        </td>
                        <td>
                          {company.contactEmail || '—'}
                          <div className="muted small">{company.contactPhone || ''}</div>
                        </td>
                        <td className="table-actions">
                          <Button
                            size="sm"
                            variant="success"
                            disabled={busyKey === `companies-${company.companyId}`}
                            onClick={() => approve('companies', company.companyId)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busyKey === `companies-${company.companyId}`}
                            onClick={() => reject('companies', company.companyId)}
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Pending buses" subtitle="GET /api/admin/buses?status=PENDING">
            {buses.length === 0 && <Empty title="No pending buses" />}
            {buses.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bus</th>
                      <th>Company</th>
                      <th>Capacity</th>
                      <th>Amenities</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buses.map((bus) => (
                      <tr key={bus.busId}>
                        <td>
                          <strong>{bus.registrationNumber}</strong>
                          <div className="muted small">{bus.model}</div>
                        </td>
                        <td>{bus.company?.companyName ?? '—'}</td>
                        <td>{bus.seatCapacity}</td>
                        <td>{bus.amenities.length > 0 ? bus.amenities.join(', ') : '—'}</td>
                        <td className="table-actions">
                          <Button
                            size="sm"
                            variant="success"
                            disabled={busyKey === `buses-${bus.busId}`}
                            onClick={() => approve('buses', bus.busId)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busyKey === `buses-${bus.busId}`}
                            onClick={() => reject('buses', bus.busId)}
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Pending routes" subtitle="GET /api/admin/routes?status=PENDING">
            {routes.length === 0 && <Empty title="No pending routes" />}
            {routes.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Company</th>
                      <th>Stops</th>
                      <th>Travel time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => (
                      <tr key={route.routeId}>
                        <td>
                          <strong>{route.routeName}</strong>
                          <div className="muted small">
                            {route.origin} → {route.destination}
                          </div>
                        </td>
                        <td>{route.company?.companyName ?? '—'}</td>
                        <td>{route.intermediateStops.length > 0 ? route.intermediateStops.join(', ') : '—'}</td>
                        <td>{route.estimatedTravelTime ? `${route.estimatedTravelTime} min` : '—'}</td>
                        <td className="table-actions">
                          <Button
                            size="sm"
                            variant="success"
                            disabled={busyKey === `routes-${route.routeId}`}
                            onClick={() => approve('routes', route.routeId)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busyKey === `routes-${route.routeId}`}
                            onClick={() => reject('routes', route.routeId)}
                          >
                            Reject
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
      )}
    </>
  );
}

const roles: Role[] = ['PASSENGER', 'DRIVER', 'OPERATOR', 'ADMIN'];

function UsersTab() {
  const { user: currentUser, refreshUser } = useAuth();
  const users = useFetch(() => api<PaginatedUsers>('/admin/users?limit=100'), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateRole = async (user: User, role: Role) => {
    if (user.userId === currentUser?.userId && role !== 'ADMIN') {
      const confirmed = window.confirm('You are about to remove your own admin role. Continue?');
      if (!confirmed) return;
    }
    setBusyId(user.userId);
    setError(null);
    try {
      await api(`/admin/users/${user.userId}/role`, { method: 'PUT', body: { role } });
      users.reload();
      if (user.userId === currentUser?.userId) await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {error && <Notice tone="danger" title="Could not update role">{error}</Notice>}
      {users.loading && <Loading />}
      {users.error && <ErrorBox error={users.error} onRetry={users.reload} />}
      {users.data && (
        <Card title="Users" subtitle={`${users.data.total} account(s)`}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.data.users.map((user) => (
                  <tr key={user.userId}>
                    <td>
                      <strong>{user.fullName}</strong>
                      <div className="muted small">{user.email}</div>
                    </td>
                    <td>{user.phoneNumber}</td>
                    <td>
                      <Select
                        value={user.role}
                        disabled={busyId === user.userId}
                        onChange={(event) => updateRole(user, event.target.value as Role)}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {label(role)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <Badge tone={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{fmtDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function SettingsTab() {
  const settings = useFetch(() => api<PlatformSettings>('/admin/settings'), []);
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data && !form) {
      setForm(settings.data);
    }
  }, [settings.data, form]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api<PlatformSettings>('/admin/settings', {
        method: 'PUT',
        body: {
          commissionRate: Number(form.commissionRate),
          platformName: form.platformName,
          currency: form.currency,
          seatLockDurationMinutes: Number(form.seatLockDurationMinutes),
        },
      });
      setForm(updated);
      setSuccess('Platform settings saved.');
      settings.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {settings.loading && <Loading />}
      {settings.error && <ErrorBox error={settings.error} onRetry={settings.reload} />}
      {error && <Notice tone="danger" title="Could not save settings">{error}</Notice>}
      {success && <Notice tone="success" title="Saved">{success}</Notice>}

      {form && (
        <Card title="Platform settings" subtitle="PUT /api/admin/settings">
          <form className="form-grid" onSubmit={submit}>
            <Field label="Platform name">
              <Input
                value={form.platformName}
                onChange={(event) => setForm({ ...form, platformName: event.target.value })}
              />
            </Field>
            <Field label="Currency">
              <Input
                value={form.currency}
                onChange={(event) => setForm({ ...form, currency: event.target.value })}
              />
            </Field>
            <Field label="Commission rate" hint="0 to 1, e.g. 0.10 = 10%">
              <Input
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={form.commissionRate}
                onChange={(event) => setForm({ ...form, commissionRate: Number(event.target.value) })}
              />
            </Field>
            <Field label="Seat lock duration (minutes)">
              <Input
                type="number"
                min={1}
                value={form.seatLockDurationMinutes}
                onChange={(event) =>
                  setForm({ ...form, seatLockDurationMinutes: Number(event.target.value) })
                }
              />
            </Field>
            <div className="form-actions">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save settings'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

function AdminAnalyticsTab() {
  const analytics = useFetch(() => api<Analytics>('/admin/analytics'), []);

  return (
    <>
      {analytics.loading && <Loading />}
      {analytics.error && <ErrorBox error={analytics.error} onRetry={analytics.reload} />}
      {analytics.data && (
        <>
          <div className="stat-grid">
            <Stat label="Users" value={analytics.data.totalUsers} />
            <Stat label="Operators" value={analytics.data.totalOperators} />
            <Stat label="Confirmed bookings" value={analytics.data.totalBookings} tone="success" />
            <Stat label="Revenue" value={fmtMoney(analytics.data.totalRevenue)} tone="success" />
          </div>
          <AnalyticsPanel data={analytics.data} />
        </>
      )}
    </>
  );
}

function ReportsTab() {
  const reports = useFetch(() => api<EmergencyReport[]>('/emergency'), []);

  return (
    <>
      {reports.loading && <Loading />}
      {reports.error && <ErrorBox error={reports.error} onRetry={reports.reload} />}
      {reports.data && (
        <Card title="Emergency reports" subtitle="GET /api/emergency">
          {reports.data.length === 0 && <Empty title="No emergency reports" />}
          {reports.data.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Driver</th>
                    <th>Trip</th>
                    <th>Location</th>
                    <th>Description</th>
                    <th>Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.data.map((report) => (
                    <tr key={report.reportId}>
                      <td><Badge tone="danger">{label(report.emergencyType)}</Badge></td>
                      <td>{report.driver?.fullName ?? '—'}</td>
                      <td>{report.trip?.route?.routeName ?? '—'}</td>
                      <td>{report.location ?? '—'}</td>
                      <td>{report.description ?? '—'}</td>
                      <td>{fmtDate(report.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
