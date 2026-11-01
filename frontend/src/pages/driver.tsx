import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { QrCameraScanner } from '../components/QrCameraScanner';
import { useFetch } from '../lib/hooks';
import { fmtDate, label, statusTone } from '../lib/format';
import type { EmergencyReport, EmergencyType, ScanResult, Trip } from '../lib/types';
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
  StatusBadge,
  Textarea,
} from '../components/ui';

export function DriverPage() {
  const navigate = useNavigate();
  const trips = useFetch(() => api<Trip[]>('/trips/my/assigned'), [], { refreshMs: 10_000 });
  const list = trips.data ?? [];

  return (
    <div className="page">
      <PageHeader
        title="My trips"
        subtitle="Trips assigned to your driver account. Open the manifest to board passengers."
        actions={
          <div className="row-actions">
            <LiveBadge refreshing={trips.refreshing} />
            <Button onClick={() => navigate('/driver/scan')}>Scan ticket</Button>
          </div>
        }
      />

      {trips.loading && <Loading />}
      {trips.error && <ErrorBox error={trips.error} onRetry={trips.reload} />}
      {!trips.loading && !trips.error && list.length === 0 && (
        <Empty title="No assigned trips" hint="An operator needs to assign you to a trip." />
      )}

      <div className="card-grid">
        {list.map((trip) => (
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
                <span className="muted">Bus</span>
                <strong>{trip.bus?.registrationNumber ?? '—'}</strong>
              </div>
            </div>
            <div className="chips">
              <Badge>{trip.bus?.model ?? 'Bus'}</Badge>
              <Badge>{trip.bus?.seatCapacity ?? '—'} seats</Badge>
              {trip.isRecurring && <Badge tone="info">Recurring</Badge>}
            </div>
            <div className="card-actions">
              <Button onClick={() => navigate(`/driver/manifest/${trip.tripId}`)}>Open manifest</Button>
              <Button variant="ghost" onClick={() => navigate('/driver/scan')}>Scan</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ScanPage() {
  const trips = useFetch(() => api<Trip[]>('/trips/my/assigned'), [], { refreshMs: 30_000 });
  const [mode, setMode] = useState<'qr' | 'id'>('qr');
  const [payload, setPayload] = useState('');
  const [tripId, setTripId] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // On a phone the result card sits below a tall camera preview, so bring it
  // into view the moment a scan lands.
  const resultRef = useRef<HTMLDivElement | null>(null);

  const revealResult = () => {
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const validate = async (raw: string, inputMode: 'qr' | 'id' = mode) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    setResult(null);
    try {
      const qrCodeData =
        inputMode === 'id' ? JSON.stringify({ bookingId: trimmed }) : trimmed;
      const scan = await api<ScanResult>('/boarding/scan', {
        method: 'POST',
        body: { qrCodeData, tripId: tripId || undefined },
      });
      setResult(scan);
      if (scan.valid) navigator.vibrate?.(120);
      revealResult();
    } catch (err) {
      setError(errorMessage(err));
      revealResult();
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void validate(payload);
  };

  const handleCameraScan = (data: string) => {
    if (busy) return;
    setMode('qr');
    setPayload(data);
    void validate(data, 'qr');
  };

  const markBoarded = async () => {
    if (!result?.booking) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api('/boarding/board', {
        method: 'POST',
        body: { bookingId: result.booking.bookingId },
      });
      setMessage(`Passenger in seat ${result.booking.seatNumber} marked as boarded.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const markDroppedOff = async () => {
    if (!result?.booking) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api('/boarding/dropoff', {
        method: 'POST',
        body: { bookingId: result.booking.bookingId },
      });
      setMessage(`Passenger in seat ${result.booking.seatNumber} marked as dropped off.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPayload(text);
    } catch {
      setError('Clipboard access was denied. Paste manually with Ctrl+V.');
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Scan ticket"
        subtitle="Scan the passenger's QR code with the camera, then mark them boarded or dropped off."
      />

      <div className="two-col">
        <Card title="Scan a ticket" subtitle="Use the camera, upload a screenshot, or enter the payload manually.">
          <QrCameraScanner onScan={handleCameraScan} busy={busy} />

          <div className="section-divider" />
          <div className="form-section-title">Manual entry</div>

          <form className="stack" onSubmit={submit}>
            <Field label="Input type">
              <Select value={mode} onChange={(event) => setMode(event.target.value as 'qr' | 'id')}>
                <option value="qr">QR payload (JSON from ticket)</option>
                <option value="id">Booking ID (testing shortcut)</option>
              </Select>
            </Field>

            <Field
              label={mode === 'qr' ? 'QR payload' : 'Booking ID'}
              hint={
                mode === 'qr'
                  ? 'Copy the raw payload from the passenger ticket page.'
                  : 'The app will wrap this in {"bookingId": "..."} before scanning.'
              }
            >
              <Textarea
                rows={mode === 'qr' ? 6 : 2}
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
                placeholder={mode === 'qr' ? '{"bookingId":"...","passengerName":"..."}' : 'booking UUID'}
              />
            </Field>

            <div className="row-actions">
              <Button type="button" variant="ghost" onClick={pasteFromClipboard}>
                Paste from clipboard
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPayload('')}>
                Clear
              </Button>
            </div>

            <Field label="Expected trip (optional)">
              <Select value={tripId} onChange={(event) => setTripId(event.target.value)}>
                <option value="">Any trip</option>
                {trips.data?.map((trip) => (
                  <option key={trip.tripId} value={trip.tripId}>
                    {trip.route?.routeName} · {fmtDate(trip.departureTime)}
                  </option>
                ))}
              </Select>
            </Field>

            {error && <Notice tone="danger" title="Scan failed">{error}</Notice>}
            {message && <Notice tone="success" title="Done">{message}</Notice>}

            <Button type="submit" disabled={busy || !payload.trim()}>
              {busy ? 'Validating…' : 'Validate ticket'}
            </Button>
          </form>
        </Card>

        <div ref={resultRef}>
          <Card title="Scan result" subtitle="The backend enforces duplicate/date/route checks.">
          {!result && <Empty title="Nothing scanned yet" hint="Start the camera or paste a ticket payload to validate." />}
          {result && (
            <div className="stack">
              <div className="scan-status">
                <Badge tone={result.valid ? 'success' : statusTone(result.status)}>
                  {result.valid ? 'VALID' : result.status}
                </Badge>
                <strong>{result.message}</strong>
              </div>

              {result.booking && (
                <div className="selection-box">
                  <span className="muted">Booking</span>
                  <code>{result.booking.bookingId}</code>
                  <div className="chips">
                    <Badge>Seat {result.booking.seatNumber}</Badge>
                    <StatusBadge status={result.booking.boardingStatus} />
                    {result.booking.passengerName && <Badge tone="info">{result.booking.passengerName}</Badge>}
                  </div>
                </div>
              )}

              {result.valid && result.booking && (
                <div className="row-actions">
                  <Button variant="success" disabled={busy} onClick={markBoarded}>
                    Mark boarded
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={markDroppedOff}>
                    Mark dropped off
                  </Button>
                </div>
              )}
            </div>
          )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const emergencyTypes: EmergencyType[] = ['BREAKDOWN', 'ACCIDENT', 'SEVERE_DELAY'];

export function EmergencyPage() {
  const trips = useFetch(() => api<Trip[]>('/trips/my/assigned'), [], { refreshMs: 30_000 });
  const reports = useFetch(() => api<EmergencyReport[]>('/emergency'), [], { refreshMs: 10_000 });
  const [form, setForm] = useState({
    emergencyType: 'BREAKDOWN' as EmergencyType,
    description: '',
    location: '',
    tripId: '',
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
      await api('/emergency', {
        method: 'POST',
        body: {
          emergencyType: form.emergencyType,
          description: form.description.trim() || undefined,
          location: form.location.trim() || undefined,
          tripId: form.tripId || undefined,
        },
      });
      setSuccess('Emergency report submitted.');
      setForm((current) => ({ ...current, description: '', location: '' }));
      reports.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Emergency reports"
        subtitle="Report breakdowns, accidents or severe delays for your assigned trip."
      />

      <div className="two-col">
        <Card title="Report an emergency" subtitle="POST /api/emergency">
          <form className="stack" onSubmit={submit}>
            <Field label="Type" required>
              <Select
                value={form.emergencyType}
                onChange={(event) =>
                  setForm({ ...form, emergencyType: event.target.value as EmergencyType })
                }
              >
                {emergencyTypes.map((type) => (
                  <option key={type} value={type}>
                    {label(type)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Trip">
              <Select
                value={form.tripId}
                onChange={(event) => setForm({ ...form, tripId: event.target.value })}
              >
                <option value="">Not tied to a trip</option>
                {trips.data?.map((trip) => (
                  <option key={trip.tripId} value={trip.tripId}>
                    {trip.route?.routeName} · {fmtDate(trip.departureTime)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location">
              <Input
                placeholder="e.g. Kafue road, 20km from Lusaka"
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="What happened?"
              />
            </Field>

            {error && <Notice tone="danger" title="Could not submit report">{error}</Notice>}
            {success && <Notice tone="success" title="Reported">{success}</Notice>}

            <Button type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit report'}
            </Button>
          </form>
        </Card>

        <Card
          title="Recent reports"
          subtitle="GET /api/emergency"
          actions={
            <div className="row-actions">
              <LiveBadge refreshing={reports.refreshing} />
              <Button size="sm" variant="ghost" onClick={reports.reload}>Refresh</Button>
            </div>
          }
        >
          {reports.loading && <Loading />}
          {reports.error && <ErrorBox error={reports.error} onRetry={reports.reload} />}
          {!reports.loading && !reports.error && (reports.data?.length ?? 0) === 0 && (
            <Empty title="No emergency reports" hint="Reports you submit appear here." />
          )}
          <div className="stack">
            {reports.data?.map((report) => (
              <div key={report.reportId} className="list-row">
                <div>
                  <strong>{label(report.emergencyType)}</strong>
                  <span className="muted">
                    {report.location || 'No location'} · {fmtDate(report.createdAt)}
                  </span>
                  {report.description && <span className="muted small">{report.description}</span>}
                </div>
                <div className="list-row-side">
                  {report.driver && <Badge tone="info">{report.driver.fullName}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
