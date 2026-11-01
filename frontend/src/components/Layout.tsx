import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Badge } from './ui';
import { cx } from '../lib/format';
import type { Role } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const navByRole: Record<Role, NavItem[]> = {
  PASSENGER: [
    { to: '/app', label: 'Dashboard', end: true },
    { to: '/app/trips', label: 'Find trips' },
    { to: '/app/bookings', label: 'My bookings' },
  ],
  DRIVER: [
    { to: '/app', label: 'Dashboard', end: true },
    { to: '/app/driver', label: 'My trips' },
    { to: '/app/scan', label: 'Scan ticket' },
    { to: '/app/emergency', label: 'Emergency' },
  ],
  OPERATOR: [
    { to: '/app', label: 'Dashboard', end: true },
    { to: '/app/operator', label: 'Operator console' },
    { to: '/app/analytics', label: 'Analytics' },
  ],
  ADMIN: [
    { to: '/app', label: 'Dashboard', end: true },
    { to: '/app/admin', label: 'Admin console' },
    { to: '/app/analytics', label: 'Analytics' },
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

  const items = [...navByRole[user.role], { to: '/app/api', label: 'API tester' }];

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
            <div className="brand-sub">Operations Console</div>
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
            <span className="live-dot" /> localhost:3000
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
