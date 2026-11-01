import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../lib/types';
import { Card, PageHeader } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="boot-screen">
        <span className="spinner" />
        <p>Restoring session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="page">
        <PageHeader title="Access denied" subtitle="This screen is not available for your role." />
        <Card>
          <p className="muted">
            You are signed in as <strong>{user?.role ?? 'guest'}</strong>. Use the navigation to open a screen
            that belongs to your role.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
