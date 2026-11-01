class ApiEndpoints {
  // Auth
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String profile = '/auth/profile';

  // Routes
  static const String routes = '/routes';
  static const String routeById = '/routes/:id';

  // Buses
  static const String buses = '/buses';
  static const String busById = '/buses/:id';

  // Trips
  static const String trips = '/trips';
  static const String drivers = '/trips/drivers';
  static const String myAssignedTrips = '/trips/my/assigned';
  static const String tripById = '/trips/:id';
  static const String tripSeats = '/trips/:id/seats';
  static const String tripManifest = '/trips/:id/manifest';
  static const String tripOpen = '/trips/:id/open';
  static const String tripClose = '/trips/:id/close';
  static const String tripDelay = '/trips/:id/delay';
  static const String tripCancel = '/trips/:id/cancel';

  // Bookings
  static const String bookings = '/bookings';
  static const String myBookings = '/bookings/my';
  static const String bookingById = '/bookings/:id';
  static const String bookingConfirm = '/bookings/:id/confirm';
  static const String bookingCancel = '/bookings/:id/cancel';

  // Boarding
  static const String boardingScan = '/boarding/scan';
  static const String boardingBoard = '/boarding/board';
  static const String boardingDropoff = '/boarding/dropoff';
  static const String boardingManifest = '/boarding/manifest';

  // Emergency
  static const String emergency = '/emergency';

  // Admin
  static const String adminCompaniesPending = '/admin/companies/pending';
  static const String adminCompanyApprove = '/admin/companies/:id/approve';
  static const String adminCompanyReject = '/admin/companies/:id/reject';
  static const String adminBuses = '/admin/buses';
  static const String adminBusApprove = '/admin/buses/:id/approve';
  static const String adminBusReject = '/admin/buses/:id/reject';
  static const String adminRoutes = '/admin/routes';
  static const String adminRouteApprove = '/admin/routes/:id/approve';
  static const String adminRouteReject = '/admin/routes/:id/reject';
  static const String adminUsers = '/admin/users';
  static const String adminUserRole = '/admin/users/:id/role';
  static const String adminAnalytics = '/admin/analytics';
  static const String adminCommission = '/admin/settings/commission';
  static const String adminSettings = '/admin/settings';

  // Operator
  static const String operatorRegisterCompany = '/operators/register-company';
  static const String operatorMyCompany = '/operators/my-company';

  // Exports
  static const String exportPdf = '/exports/manifest/:tripId/pdf';
  static const String exportExcel = '/exports/manifest/:tripId/excel';
}
