import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, downloadFile, errorMessage } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { useAuth } from '../auth/AuthContext';
import { fmtDate, label } from '../lib/format';
import type { Manifest } from '../lib/types';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  LiveBadge,
  Loading,
  Notice,
  PageHeader,
  Stat,
  StatusBadge,
} from '../components/ui';

export function ManifestPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const manifest = useFetch(() => api<Manifest>(`/trips/${tripId}/manifest`), [tripId], { refreshMs: 5_000 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

  const canExport = user?.role === 'OPERATOR' || user?.role === 'ADMIN';

  const act = async (bookingId: string, action: 'board' | 'dropoff') => {
    setBusyId(bookingId);
    setError(null);
    setMessage(null);
    try {
      await api(`/boarding/${action}`, { method: 'POST', body: { bookingId } });
      setMessage(action === 'board' ? 'Passenger marked as boarded.' : 'Passenger marked as dropped off.');
      manifest.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const exportManifest = async (kind: 'pdf' | 'excel') => {
    if (!tripId) return;
    setDownloading(kind);
    setError(null);
    try {
      await downloadFile(
        `/exports/manifest/${tripId}/${kind}`,
        `manifest-${tripId}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`,
        token,
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Passenger manifest"
        subtitle={manifest.data ? `${manifest.data.trip.routeName} · ${fmtDate(manifest.data.trip.departureTime)}` : undefined}
        actions={
          <div className="row-actions">
            <LiveBadge refreshing={manifest.refreshing} />
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
            {canExport && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={downloading === 'pdf'}
                  onClick={() => exportManifest('pdf')}
                >
                  {downloading === 'pdf' ? 'Preparing…' : 'Export PDF'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={downloading === 'excel'}
                  onClick={() => exportManifest('excel')}
                >
                  {downloading === 'excel' ? 'Preparing…' : 'Export Excel'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {manifest.loading && <Loading />}
      {manifest.error && <ErrorBox error={manifest.error} onRetry={manifest.reload} />}
      {error && <Notice tone="danger" title="Action failed">{error}</Notice>}
      {message && <Notice tone="success" title="Updated">{message}</Notice>}

      {manifest.data && (
        <>
          <div className="stat-grid">
            <Stat label="Passengers" value={manifest.data.totals.totalPassengers} />
            <Stat label="Boarded" value={manifest.data.totals.boarded} tone="success" />
            <Stat label="Not boarded" value={manifest.data.totals.notBoarded} tone="warning" />
            <Stat label="Dropped off" value={manifest.data.totals.droppedOff} tone="neutral" />
          </div>

          <Card
            title="Trip details"
            subtitle={`${manifest.data.trip.origin} → ${manifest.data.trip.destination}`}
          >
            <div className="chips">
              <Badge>{manifest.data.trip.busReg ?? 'No bus'}</Badge>
              <Badge>{manifest.data.trip.busModel ?? '—'}</Badge>
              <Badge tone="info">{fmtDate(manifest.data.trip.departureTime)}</Badge>
            </div>
          </Card>

          <Card title="Passengers" subtitle={`${manifest.data.passengers.length} booking(s)`}>
            {manifest.data.passengers.length === 0 && (
              <Empty title="No passengers yet" hint="Bookings for this trip will appear here." />
            )}
            {manifest.data.passengers.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Seat</th>
                      <th>Passenger</th>
                      <th>Payment</th>
                      <th>Boarding</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifest.data.passengers.map((passenger) => (
                      <tr key={passenger.bookingId}>
                        <td><strong>{passenger.seatNumber}</strong></td>
                        <td>
                          <strong>{passenger.passengerName}</strong>
                          <div className="muted small">{passenger.passengerPhone}</div>
                        </td>
                        <td><StatusBadge status={passenger.paymentStatus} /></td>
                        <td><StatusBadge status={passenger.boardingStatus} /></td>
                        <td className="table-actions">
                          {passenger.boardingStatus === 'NOT_BOARDED' && passenger.paymentStatus === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="success"
                              disabled={busyId === passenger.bookingId}
                              onClick={() => act(passenger.bookingId, 'board')}
                            >
                              {busyId === passenger.bookingId ? '…' : 'Board'}
                            </Button>
                          )}
                          {passenger.boardingStatus === 'NOT_BOARDED' && passenger.paymentStatus !== 'CONFIRMED' && (
                            <span className="muted small">Awaiting payment</span>
                          )}
                          {passenger.boardingStatus === 'BOARDED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyId === passenger.bookingId}
                              onClick={() => act(passenger.bookingId, 'dropoff')}
                            >
                              {busyId === passenger.bookingId ? '…' : 'Drop off'}
                            </Button>
                          )}
                          {passenger.boardingStatus === 'DROPPED_OFF' && (
                            <span className="muted small">{label(passenger.boardingStatus)}</span>
                          )}
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
    </div>
  );
}
