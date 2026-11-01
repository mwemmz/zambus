import 'package:flutter/material.dart';
import '../../presentation/pages/splash/splash_page.dart';
import '../../presentation/pages/auth/login_page.dart';
import '../../presentation/pages/auth/register_page.dart';
import '../../presentation/pages/passenger/passenger_home.dart';
import '../../presentation/pages/passenger/trip_details_page.dart';
import '../../presentation/pages/passenger/seat_selection_page.dart';
import '../../presentation/pages/passenger/booking_review_page.dart';
import '../../presentation/pages/passenger/ticket_page.dart';
import '../../presentation/pages/passenger/my_bookings_page.dart';
import '../../presentation/pages/driver/driver_home.dart';
import '../../presentation/pages/driver/qr_scanner_page.dart';
import '../../presentation/pages/driver/manifest_page.dart';
import '../../presentation/pages/driver/emergency_page.dart';
import '../../presentation/pages/driver/dropoff_alerts_page.dart';
import '../../presentation/pages/operator/operator_home.dart';
import '../../presentation/pages/operator/fleet/buses_list_page.dart';
import '../../presentation/pages/operator/fleet/bus_form_page.dart';
import '../../presentation/pages/operator/routes/routes_list_page.dart';
import '../../presentation/pages/operator/routes/route_form_page.dart';
import '../../presentation/pages/operator/trips/trips_list_page.dart';
import '../../presentation/pages/operator/trips/trip_form_page.dart';
import '../../presentation/pages/operator/analytics/revenue_dashboard_page.dart';
import '../../presentation/pages/operator/register_company_page.dart';
import '../../presentation/pages/admin/admin_home.dart';
import '../../presentation/pages/admin/approvals_page.dart';
import '../../presentation/pages/admin/companies_page.dart';
import '../../presentation/pages/admin/users_page.dart';
import '../../presentation/pages/admin/settings_page.dart';

class AppRouter {
  static const String splash = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String passengerHome = '/passenger';
  static const String driverHome = '/driver';
  static const String operatorHome = '/operator';
  static const String adminHome = '/admin';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case splash:
        return _buildRoute(const SplashPage(), settings);
      case login:
        return _buildRoute(const LoginPage(), settings);
      case register:
        return _buildRoute(const RegisterPage(), settings);
      case passengerHome:
        return _buildRoute(const PassengerHome(), settings);
      case driverHome:
        return _buildRoute(const DriverHome(), settings);
      case operatorHome:
        return _buildRoute(const OperatorHome(), settings);
      case adminHome:
        return _buildRoute(const AdminHome(), settings);

      // Passenger routes
      case '/passenger/trip-details':
        final tripId = settings.arguments as String;
        return _buildRoute(TripDetailsPage(tripId: tripId), settings);
      case '/passenger/seat-selection':
        final args = settings.arguments as Map<String, dynamic>;
        return _buildRoute(
          SeatSelectionPage(
            tripId: args['tripId'],
            busCapacity: args['busCapacity'] ?? 40,
          ),
          settings,
        );
      case '/passenger/booking-review':
        final args = settings.arguments as Map<String, dynamic>;
        return _buildRoute(
          BookingReviewPage(
            tripId: args['tripId'],
            seatNumber: args['seatNumber'],
          ),
          settings,
        );
      case '/passenger/ticket':
        final bookingId = settings.arguments as String;
        return _buildRoute(TicketPage(bookingId: bookingId), settings);
      case '/passenger/my-bookings':
        return _buildRoute(const MyBookingsPage(), settings);

      // Driver routes
      case '/driver/scan':
        return _buildRoute(const QrScannerPage(), settings);
      case '/driver/manifest':
        final tripId = settings.arguments as String?;
        return _buildRoute(ManifestPage(tripId: tripId), settings);
      case '/driver/emergency':
        return _buildRoute(const EmergencyPage(), settings);
      case '/driver/dropoff':
        return _buildRoute(const DropoffAlertsPage(), settings);

      // Operator routes
      case '/operator/buses':
        return _buildRoute(const BusesListPage(), settings);
      case '/operator/bus-form':
        return _buildRoute(const BusFormPage(), settings);
      case '/operator/routes':
        return _buildRoute(const RoutesListPage(), settings);
      case '/operator/route-form':
        return _buildRoute(const RouteFormPage(), settings);
      case '/operator/trips':
        return _buildRoute(const TripsListPage(), settings);
      case '/operator/trip-form':
        return _buildRoute(const TripFormPage(), settings);
      case '/operator/analytics':
        return _buildRoute(const RevenueDashboardPage(), settings);
      case '/operator/register-company':
        return _buildRoute(const RegisterCompanyPage(), settings);

      // Admin routes
      case '/admin/approvals':
        final tabIndex = settings.arguments is int ? settings.arguments as int : 0;
        return _buildRoute(ApprovalsPage(initialTabIndex: tabIndex), settings);
      case '/admin/companies':
        return _buildRoute(const CompaniesPage(), settings);
      case '/admin/users':
        return _buildRoute(const UsersPage(), settings);
      case '/admin/settings':
        return _buildRoute(const SettingsPage(), settings);

      default:
        return _buildRoute(
          const Scaffold(body: Center(child: Text('Page not found'))),
          settings,
        );
    }
  }

  static Route<dynamic> _buildRoute(Widget page, RouteSettings settings) {
    return MaterialPageRoute(builder: (_) => page, settings: settings);
  }

  static String getHomeRoute(String role) {
    return switch (role) {
      'PASSENGER' => passengerHome,
      'DRIVER' => driverHome,
      'OPERATOR' => operatorHome,
      'ADMIN' => adminHome,
      _ => login,
    };
  }
}
