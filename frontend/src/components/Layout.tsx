import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Badge } from './ui';
import { cx } from '../lib/format';
import type { Role } from '../lib/types';

/**
 * Operator / admin console.
 *
 * This is the dense, sidebar-driven surface. Passengers use the storefront
 * (components/AppShells.tsx → PassengerShell) and drivers use the crew app
 * (DriverShell); neither should land here.
 */

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const navByRole: Record<Role, NavItem[]> = {
  PASSENGER: [],
  DRIVER: [],
  OPERATOR: [
    { to: '/app', label: 'Overview', end: true },
    { to: '/app/operator', label: 'Operator console' },
    { to: '/app/analytics', label: 'Analytics' },
    { to: '/app/api', label: 'API explorer' },
  ],
  ADMIN: [
    { to: '/app', label: 'Overview', end: true },
    { to: '/app/admin', label: 'Admin console' },
    { to: '/app/analytics', label: 'Analytics' },
    { to: '/app/api', label: 'API explorer' },
  ],
};

const roleTone: Record<Role, 'primary' | 'info' | 'success' | 'danger'> = {
  PASSENGER: 'primary',
  DRIVER: 'info',
  OPERATOR: 'success',
  ADMIN: 'danger',
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  // Wrong surface for the role — send them to their own app.
  if (user.role === 'PASSENGER') return <Navigate to="/my-trips" replace />;
  if (user.role === 'DRIVER') return <Navigate to="/driver" replace />;

  const items = navByRole[user.role];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <aside className={cx('sidebar', menuOpen && 'sidebar-open')}>
        <div className="brand">
          <div className="brand-mark">Z</div>
          <div>
            <div className="brand-name">ZamBus</div>
            <div className="brand-sub">Operations console</div>
          </div>
        </div>

        <nav className="nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cx('nav-link', isActive && 'nav-link-active')}
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-dot" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link className="nav-link nav-link-muted" to="/">
            ← Passenger storefront
          </Link>
          <div className="user-card">
            <div className="avatar">{user.fullName.charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <Badge tone={roleTone[user.role]}>{user.role}</Badge>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="menu-btn" onClick={() => setMenuOpen((open) => !open)}>
            ☰
          </button>
          <div className="topbar-title">
            <span className="live-dot" /> ZamBus operations
          </div>
          <div className="topbar-actions">
            <Badge tone={roleTone[user.role]}>{user.role}</Badge>
            <span className="topbar-user">{user.fullName}</span>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
