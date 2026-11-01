import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { cx } from '../lib/format';

/**
 * Two visually separate products share this codebase:
 *
 *  - PassengerShell — a public "storefront": sticky top nav, marketing hero,
 *    wide content column. Browsing and searching work signed out; sign-in is
 *    only demanded when a seat is actually held.
 *  - DriverShell — a phone-first crew app: dark chrome, thumb-reachable tab
 *    bar, scan as the primary action.
 *
 * The operator/admin console keeps the dense sidebar (components/Layout.tsx).
 */

function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="p-actions">
        <Link className="btn btn-ghost btn-sm" to="/login" onClick={onNavigate}>
          Sign in
        </Link>
        <Link className="btn btn-primary btn-sm" to="/register" onClick={onNavigate}>
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="p-actions">
      <Link className="p-user" to="/my-trips" onClick={onNavigate}>
        <span className="avatar avatar-sm">{user.fullName.charAt(0).toUpperCase()}</span>
        <span className="p-user-name">{user.fullName.split(' ')[0]}</span>
      </Link>
      {user.role !== 'PASSENGER' && (
        <Link
          className="btn btn-ghost btn-sm p-switch"
          to={user.role === 'DRIVER' ? '/driver' : '/app'}
          onClick={onNavigate}
        >
          {user.role === 'DRIVER' ? 'Driver app' : 'Console'}
        </Link>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          logout();
          navigate('/', { replace: true });
        }}
      >
        Sign out
      </button>
    </div>
  );
}

const passengerLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/search', label: 'Find a trip' },
  { to: '/my-trips', label: 'My trips' },
];

export function PassengerShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="passenger-shell">
      <header className="p-nav">
        <div className="p-nav-inner">
          <Link className="p-brand" to="/" onClick={closeMenu}>
            <span className="brand-mark">Z</span>
            <span className="p-brand-text">
              <strong>ZamBus</strong>
              <small>Intercity coaches</small>
            </span>
          </Link>

          <nav className={cx('p-links', menuOpen && 'p-links-open')}>
            {passengerLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={closeMenu}
                className={({ isActive }) => cx('p-link', isActive && 'p-link-active')}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-nav-end">
            <UserMenu onNavigate={closeMenu} />
            <button
              type="button"
              className="p-burger"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <main className="p-main" key={location.pathname.startsWith('/search') ? 'search' : 'rest'}>
        <Outlet />
      </main>

      <footer className="p-footer">
        <div className="p-footer-inner">
          <div>
            <div className="p-brand p-brand-footer">
              <span className="brand-mark small">Z</span>
              <strong>ZamBus</strong>
            </div>
            <p className="muted small">
              Smart digital intercity bus management for Zambia — search, hold a seat, pay with mobile money
              and board with a QR ticket.
            </p>
          </div>
          <div className="p-footer-links">
            <Link to="/search">Find a trip</Link>
            <Link to="/my-trips">My trips</Link>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
        <div className="p-footer-base">
          <span className="muted small">© {new Date().getFullYear()} ZamBus</span>
          <span className="muted small">Fares in ZMW · mobile money payments</span>
        </div>
      </footer>
    </div>
  );
}

const driverTabs = [
  { to: '/driver', label: 'Trips', icon: '▤', end: true },
  { to: '/driver/scan', label: 'Scan', icon: '⌗' },
  { to: '/driver/emergency', label: 'Report', icon: '!' },
];

export function DriverShell({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="driver-shell">
      <header className="driver-top">
        <Link className="driver-brand" to="/driver">
          <span className="brand-mark small">Z</span>
          <span>
            <strong>Crew</strong>
            <small>{user?.fullName ?? 'Driver'}</small>
          </span>
        </Link>
        <div className="driver-top-actions">
          {location.pathname !== '/driver/scan' && (
            <Link className="driver-scan-cta" to="/driver/scan">
              ⌗ Scan
            </Link>
          )}
          <button
            type="button"
            className="driver-signout"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="driver-main">{children ?? <Outlet />}</main>

      <nav className="driver-tabs">
        {driverTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => cx('driver-tab', isActive && 'driver-tab-active')}
          >
            <span className="driver-tab-icon">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
