import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth, RequireRole } from './components/guards';
import { LoginPage } from './pages/auth';
import { RegisterPage } from './pages/auth';
import { DashboardPage } from './pages/dashboard';
import { MyBookingsPage, SearchTripsPage, TicketPage, TripDetailsPage } from './pages/passenger';
import { DriverPage, EmergencyPage, ScanPage } from './pages/driver';
import { ManifestPage } from './pages/manifest';
import { OperatorPage } from './pages/operator';
import { AdminPage } from './pages/admin';
import { AnalyticsPage } from './pages/analytics';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="trips" element={<SearchTripsPage />} />
        <Route path="trips/:tripId" element={<TripDetailsPage />} />
        <Route path="bookings" element={<MyBookingsPage />} />
        <Route path="bookings/:bookingId" element={<TicketPage />} />

        <Route
          path="driver"
          element={
            <RequireRole roles={['DRIVER']}>
              <DriverPage />
            </RequireRole>
          }
        />
        <Route
          path="manifest/:tripId"
          element={
            <RequireRole roles={['DRIVER', 'OPERATOR', 'ADMIN']}>
              <ManifestPage />
            </RequireRole>
          }
        />
        <Route
          path="scan"
          element={
            <RequireRole roles={['DRIVER']}>
              <ScanPage />
            </RequireRole>
          }
        />
        <Route
          path="emergency"
          element={
            <RequireRole roles={['DRIVER']}>
              <EmergencyPage />
            </RequireRole>
          }
        />

        <Route
          path="operator"
          element={
            <RequireRole roles={['OPERATOR']}>
              <OperatorPage />
            </RequireRole>
          }
        />
        <Route
          path="admin"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminPage />
            </RequireRole>
          }
        />
        <Route
          path="analytics"
          element={
            <RequireRole roles={['OPERATOR', 'ADMIN']}>
              <AnalyticsPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
