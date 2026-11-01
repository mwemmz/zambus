import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { fmtMoney } from '../lib/format';
import type { Analytics } from '../lib/types';
import { Button, Card, ErrorBox, Loading, Notice, PageHeader, Stat } from '../components/ui';

export function AnalyticsPanel({ data }: { data: Analytics }) {
  if (data.hasCompany === false) {
    return (
      <Notice tone="warning" title="No company registered">
        Register a bus company and wait for admin approval to start earning.
      </Notice>
    );
  }

  return (
    <>
      <div className="stat-grid">
        <Stat label="Total revenue" value={fmtMoney(data.totalRevenue)} tone="success" hint="Confirmed bookings" />
        <Stat label="Confirmed bookings" value={data.totalBookings} />
        <Stat label="Active trips" value={data.totalActiveTrips} tone="warning" />
        <Stat label="Commission rate" value={`${(data.commissionRate * 100).toFixed(1)}%`} tone="neutral" />
      </div>

      <div className="two-col">
        <Card title="Revenue split">
          <div className="commission-row">
            <div>
              <span className="muted">Gross revenue</span>
              <strong>{fmtMoney(data.totalRevenue)}</strong>
            </div>
            <div>
              <span className="muted">Platform commission</span>
              <strong>{fmtMoney(data.commissionAmount)}</strong>
            </div>
            <div>
              <span className="muted">Net payout</span>
              <strong>{fmtMoney(data.netPayout)}</strong>
            </div>
          </div>
        </Card>

        <Card title="Platform scope">
          <div className="stack">
            <div className="list-row">
              <span>Users</span>
              <strong>{data.totalUsers}</strong>
            </div>
            <div className="list-row">
              <span>Operators</span>
              <strong>{data.totalOperators}</strong>
            </div>
            {typeof data.totalBuses === 'number' && (
              <div className="list-row">
                <span>Buses</span>
                <strong>{data.totalBuses}</strong>
              </div>
            )}
            {typeof data.totalRoutes === 'number' && (
              <div className="list-row">
                <span>Routes</span>
                <strong>{data.totalRoutes}</strong>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const analytics = useFetch(() => api<Analytics>('/admin/analytics'), []);

  return (
    <div className="page">
      <PageHeader
        title="Analytics"
        subtitle="Revenue, bookings and commission, scoped to your role."
        actions={<Button variant="ghost" onClick={() => navigate('/app')}>Back to dashboard</Button>}
      />
      {analytics.loading && <Loading />}
      {analytics.error && <ErrorBox error={analytics.error} onRetry={analytics.reload} />}
      {analytics.data && <AnalyticsPanel data={analytics.data} />}
    </div>
  );
}
