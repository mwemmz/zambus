import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DriverShell, PassengerShell } from './components/AppShells';
import { RequireAuth, RequireRole } from './components/guards';
import { HomePage } from './pages/home';
import { SearchResultsPage } from './pages/search';
import { TripBookingPage } from './pages/booking';
import { MyTripsPage, PassengerTicketPage } from './pages/mytrips';
import { LoginPage, RegisterPage } from './pages/auth';
import { DashboardPage } from './pages/dashboard';
import { DriverPage, EmergencyPage, ScanPage } from './pages/driver';
import { ManifestPage } from './pages/manifest';
import { OperatorPage } from './pages/operator';
import { AdminPage } from './pages/admin';
import { AnalyticsPage } from './pages/analytics';
import { ApiExplorerPage } from './pages/apiExplorer';

export default function App() {
  return (
    <Routes>
      {/* ---------- passenger storefront ---------- */}
      <Route element={<PassengerShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route
          path="/trips/:tripId"
          element={
            <RequireAuth>
              <TripBookingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-trips"
          element={
            <RequireAuth>
              <MyTripsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-trips/:bookingId"
          element={
            <RequireAuth>
              <PassengerTicketPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ---------- driver crew app ---------- */}
      <Route
        path="/driver"
        element={
          <RequireAuth>
            <RequireRole roles={['DRIVER']}>
              <DriverShell />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<DriverPage />} />
        <Route path="scan" element={<ScanPage />} />
        <Route path="emergency" element={<EmergencyPage />} />
        <Route path="manifest/:tripId" element={<ManifestPage />} />
      </Route>

      {/* ---------- operator / admin console ---------- */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
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
        <Route
          path="manifest/:tripId"
          element={
            <RequireRole roles={['OPERATOR', 'ADMIN']}>
              <ManifestPage />
            </RequireRole>
          }
        />
        <Route
          path="api"
          element={
            <RequireRole roles={['OPERATOR', 'ADMIN']}>
              <ApiExplorerPage />
            </RequireRole>
          }
        />
      </Route>

      {/* ---------- legacy links from the old single-app layout ---------- */}
      <Route path="/app/trips" element={<Navigate to="/search" replace />} />
      <Route path="/app/trips/:tripId" element={<LegacyTripRedirect />} />
      <Route path="/app/bookings" element={<Navigate to="/my-trips" replace />} />
      <Route path="/app/bookings/:bookingId" element={<LegacyBookingRedirect />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LegacyTripRedirect() {
  const { tripId } = useParams<{ tripId: string }>();
  return <Navigate to={`/trips/${tripId ?? ''}`} replace />;
}

function LegacyBookingRedirect() {
  const { bookingId } = useParams<{ bookingId: string }>();
  return <Navigate to={`/my-trips/${bookingId ?? ''}`} replace />;
}
