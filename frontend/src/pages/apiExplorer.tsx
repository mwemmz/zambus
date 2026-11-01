import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage } from '../lib/api';
import { Badge, Button, Card, Field, Input, Notice, PageHeader, Select, Textarea } from '../components/ui';

const quickCalls = [
  { method: 'GET', path: '/health', label: 'Health check' },
  { method: 'GET', path: '/trips?limit=5', label: 'Public trips' },
  { method: 'GET', path: '/auth/me', label: 'Current user' },
  { method: 'GET', path: '/bookings/my', label: 'My bookings' },
  { method: 'GET', path: '/trips/my/assigned', label: 'Driver trips' },
  { method: 'GET', path: '/operators/my-company', label: 'My company' },
  { method: 'GET', path: '/admin/analytics', label: 'Analytics' },
  { method: 'GET', path: '/admin/settings', label: 'Platform settings' },
  { method: 'GET', path: '/admin/companies/pending', label: 'Pending companies' },
  { method: 'GET', path: '/emergency', label: 'Emergency reports' },
];

export function ApiExplorerPage() {
  const { user } = useAuth();
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [path, setPath] = useState('/health');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      let parsedBody: unknown = undefined;
      if (body.trim()) {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          throw new Error('Request body is not valid JSON.');
        }
      }

      const normalized = path.startsWith('/api/') ? path.slice(4) : path;
      const response = await api<unknown>(normalized, {
        method,
        body: method === 'GET' || method === 'DELETE' ? undefined : parsedBody,
      });
      setResult(response);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const useQuickCall = (call: { method: string; path: string }) => {
    setMethod(call.method as typeof method);
    setPath(call.path);
    setBody('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="page">
      <PageHeader
        title="API tester"
        subtitle="Call any backend endpoint with your current session. Paths are relative to /api."
      />

      <div className="two-col">
        <Card title="Request" subtitle="Useful for checking endpoints that have no dedicated screen.">
          <form className="stack" onSubmit={send}>
            <div className="request-line">
              <Field label="Method">
                <Select value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </Select>
              </Field>
              <Field label="Path" hint="Example: /trips or /admin/users">
                <Input value={path} onChange={(event) => setPath(event.target.value)} />
              </Field>
            </div>

            <Field label="JSON body" hint="Only sent for POST and PUT.">
              <Textarea
                rows={6}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={'{\n  "key": "value"\n}'}
              />
            </Field>

            <div className="row-actions">
              <Button type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send request'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setBody('');
                  setResult(null);
                  setError(null);
                }}
              >
                Clear
              </Button>
            </div>

            <div className="muted small">
              Signed in as <strong>{user?.fullName}</strong> ({user?.role}). The session token is attached
              automatically.
            </div>
          </form>
        </Card>

        <Card title="Response" subtitle="Unwrapped `data` from the API envelope.">
          {error && <Notice tone="danger" title="Request failed">{error}</Notice>}
          {!error && result === null && <p className="muted">Send a request to see the response here.</p>}
          {result !== null && (
            <>
              <div className="row-actions">
                <Badge tone="success">OK</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                >
                  Copy JSON
                </Button>
              </div>
              <pre className="code-block tall">{JSON.stringify(result, null, 2)}</pre>
            </>
          )}
        </Card>
      </div>

      <Card title="Quick calls" subtitle="Click to load a request, then press Send.">
        <div className="quick-grid">
          {quickCalls.map((call) => (
            <button
              type="button"
              key={`${call.method}-${call.path}`}
              className="quick-call"
              onClick={() => useQuickCall(call)}
            >
              <Badge tone={call.method === 'GET' ? 'info' : 'warning'}>{call.method}</Badge>
              <span>{call.label}</span>
              <code>{call.path}</code>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
