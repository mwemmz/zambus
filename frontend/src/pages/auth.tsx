import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/api';
import { Button, Field, Input, Notice, Select } from '../components/ui';

const demoAccounts = [
  { role: 'Passenger', email: 'passenger@zambus.com', password: 'passenger123' },
  { role: 'Driver', email: 'driver@zambus.com', password: 'driver123' },
  { role: 'Operator', email: 'operator@zambus.com', password: 'operator123' },
  { role: 'Admin', email: 'admin@zambus.com', password: 'admin123' },
];

function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="brand brand-large">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-name">ZamBus</div>
            <div className="brand-sub">Operations Console</div>
          </div>
        </div>
        <h1>Test every role from one browser.</h1>
        <p>
          Passenger bookings, driver boarding, operator fleet and admin approvals — wired to the local
          Express API.
        </p>
        <div className="auth-points">
          <span>● Live API</span>
          <span>● Role-aware navigation</span>
          <span>● QR ticket testing</span>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('passenger@zambus.com');
  const [password, setPassword] = useState('passenger123');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && token) return <Navigate to="/app" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith('/app') ? from : '/app', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const quickLogin = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <AuthShell title="Sign in" subtitle="Use a seeded account or your own credentials.">
      <form onSubmit={submit} className="form-stack">
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" required>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        {error && <Notice tone="danger" title="Sign in failed">{error}</Notice>}

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="demo-accounts">
        <div className="demo-title">Seeded demo accounts</div>
        <div className="demo-grid">
          {demoAccounts.map((account) => (
            <button
              type="button"
              key={account.email}
              className="demo-account"
              onClick={() => quickLogin(account)}
            >
              <strong>{account.role}</strong>
              <span>{account.email}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="auth-switch">
        No account? <Link to="/register">Register as a passenger</Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register, user, token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '+260',
    password: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && token) return <Navigate to="/app" replace />;

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
      });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create an account" subtitle="New accounts are created with the PASSENGER role.">
      <form onSubmit={submit} className="form-stack">
        <Field label="Full name" required>
          <Input value={form.fullName} onChange={update('fullName')} minLength={2} required />
        </Field>
        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={update('email')} required />
        </Field>
        <Field label="Phone number" hint="At least 10 characters, e.g. +260977000000" required>
          <Input value={form.phoneNumber} onChange={update('phoneNumber')} minLength={10} required />
        </Field>
        <Field label="Password" hint="At least 6 characters" required>
          <Input
            type="password"
            value={form.password}
            onChange={update('password')}
            minLength={6}
            required
          />
        </Field>
        <Field label="Role">
          <Select value="PASSENGER" disabled>
            <option value="PASSENGER">Passenger</option>
          </Select>
        </Field>

        {error && <Notice tone="danger" title="Registration failed">{error}</Notice>}

        <Button type="submit" size="lg" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
