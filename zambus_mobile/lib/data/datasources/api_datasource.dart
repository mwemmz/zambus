import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/models.dart';

class ApiDatasource {
  final ApiClient _apiClient;

  ApiDatasource(this._apiClient);

  // Auth
  Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String phoneNumber,
    required String password,
    String? role,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.register,
      data: {
        'fullName': fullName,
        'email': email,
        'phoneNumber': phoneNumber,
        'password': password,
        if (role != null) 'role': role,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.login,
      data: {'email': email, 'password': password},
    );
    return response.data as Map<String, dynamic>;
  }

  Future<User> getMe() async {
    final response = await _apiClient.get(ApiEndpoints.me);
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  Future<User> updateProfile({
    String? fullName,
    String? phoneNumber,
  }) async {
    final response = await _apiClient.put(
      ApiEndpoints.profile,
      data: {
        if (fullName != null) 'fullName': fullName,
        if (phoneNumber != null) 'phoneNumber': phoneNumber,
      },
    );
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  // Routes
  Future<List<Route>> getRoutes() async {
    final response = await _apiClient.get(ApiEndpoints.routes);
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((e) => Route.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Route> getRouteById(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.routeById, {'id': id});
    final response = await _apiClient.get(path);
    return Route.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Route> createRoute({
    required String routeName,
    required String origin,
    required String destination,
    List<String>? intermediateStops,
    int? estimatedTravelTime,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.routes,
      data: {
        'routeName': routeName,
        'origin': origin,
        'destination': destination,
        if (intermediateStops != null) 'intermediateStops': intermediateStops,
        if (estimatedTravelTime != null) 'estimatedTravelTime': estimatedTravelTime,
      },
    );
    return Route.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Route> updateRoute(String id, Map<String, dynamic> updates) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.routeById, {'id': id});
    final response = await _apiClient.put(path, data: updates);
    return Route.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteRoute(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.routeById, {'id': id});
    await _apiClient.delete(path);
  }

  // Buses
  Future<List<Bus>> getBuses({String? companyId}) async {
    final queryParams = companyId != null ? {'companyId': companyId} : null;
    final response = await _apiClient.get(ApiEndpoints.buses, queryParameters: queryParams);
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((e) => Bus.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Bus> getBusById(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.busById, {'id': id});
    final response = await _apiClient.get(path);
    return Bus.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Bus> createBus({
    required String registrationNumber,
    required String model,
    required int seatCapacity,
    List<String>? amenities,
    String? maintenanceStatus,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.buses,
      data: {
        'registrationNumber': registrationNumber,
        'model': model,
        'seatCapacity': seatCapacity,
        if (amenities != null) 'amenities': amenities,
        if (maintenanceStatus != null) 'maintenanceStatus': maintenanceStatus,
      },
    );
    return Bus.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Bus> updateBus(String id, Map<String, dynamic> updates) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.busById, {'id': id});
    final response = await _apiClient.put(path, data: updates);
    return Bus.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteBus(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.busById, {'id': id});
    await _apiClient.delete(path);
  }

  // Trips
  Future<List<Trip>> searchTrips({
    String? origin,
    String? destination,
    String? travelDate,
    String? filter,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      if (origin != null) 'origin': origin,
      if (destination != null) 'destination': destination,
      if (travelDate != null) 'travelDate': travelDate,
      if (filter != null) 'filter': filter,
      'page': page,
      'limit': limit,
    };
    final response = await _apiClient.get(ApiEndpoints.trips, queryParameters: queryParams);
    final data = response.data as Map<String, dynamic>;
    final List<dynamic> tripsData = data['trips'] as List<dynamic>;
    return tripsData.map((e) => Trip.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Trips assigned to the currently logged-in driver (driver app).
  Future<List<Trip>> getMyAssignedTrips() async {
    final response = await _apiClient.get(ApiEndpoints.myAssignedTrips);
    final data = response.data;
    if (data is List) {
      return data.map((e) => Trip.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  Future<Trip> getTripById(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.tripById, {'id': id});
    final response = await _apiClient.get(path);
    return Trip.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Trip> createTrip({
    required String routeId,
    required String busId,
    required String driverId,
    required DateTime departureTime,
    required DateTime estimatedArrival,
    required double fareAmount,
    bool isRecurring = false,
    String? recurrencePattern,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.trips,
      data: {
        'routeId': routeId,
        'busId': busId,
        'driverId': driverId,
        'departureTime': departureTime.toIso8601String(),
        'estimatedArrival': estimatedArrival.toIso8601String(),
        'fareAmount': fareAmount,
        'isRecurring': isRecurring,
        if (recurrencePattern != null) 'recurrencePattern': recurrencePattern,
      },
    );
    return Trip.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Trip> updateTrip(String id, Map<String, dynamic> updates) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.tripById, {'id': id});
    final response = await _apiClient.put(path, data: updates);
    return Trip.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Trip> openTrip(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.tripOpen, {'id': id});
    final response = await _apiClient.post(path);
    return Trip.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Trip> closeTrip(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.tripClose, {'id': id});
    final response = await _apiClient.post(path);
    return Trip.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Trip> delayTrip(String id, DateTime newDepartureTime) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.tripDelay, {'id': id});
    final response = await _apiClient.post(path, data: {
      'newDepartureTime': newDepartureTime.toIso8601String(),
    });
    return Trip.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Trip> cancelTrip(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.tripCancel, {'id': id});
    final response = await _apiClient.post(path);
    return Trip.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Manifest> getTripManifest(String tripId) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.tripManifest, {'id': tripId});
    final response = await _apiClient.get(path);
    return Manifest.fromJson(response.data as Map<String, dynamic>);
  }

  // Seats
  /// Fetches the live seat map for a trip. A seat is only selectable if the
  /// backend reports it as available (no pending or confirmed booking on it).
  Future<SeatMap> getTripSeats(String tripId) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.tripSeats, {'id': tripId});
    final response = await _apiClient.get(path);
    return SeatMap.fromJson(response.data as Map<String, dynamic>);
  }

  // Bookings
  Future<Booking> createBooking({
    required String tripId,
    required int seatNumber,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.bookings,
      data: {'tripId': tripId, 'seatNumber': seatNumber},
    );
    return Booking.fromJson(response.data as Map<String, dynamic>);
  }

  /// Full MVP payment flow: create the PENDING booking (locks the seat),
  /// then confirm payment so the booking becomes CONFIRMED with a final
  /// QR ticket (PAS-011 to PAS-014).
  Future<Booking> createAndConfirmBooking({
    required String tripId,
    required int seatNumber,
  }) async {
    final booking = await createBooking(tripId: tripId, seatNumber: seatNumber);
    return confirmBooking(booking.bookingId);
  }

  Future<List<Booking>> getMyBookings() async {
    final response = await _apiClient.get(ApiEndpoints.myBookings);
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((e) => Booking.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// GET /bookings/:id returns {booking, trip, passenger} as siblings.
  /// This merges the trip summary and passenger name into the booking so the
  /// ticket screen can show route/bus/departure details and who it belongs to.
  Future<Booking> getBookingById(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.bookingById, {'id': id});
    final response = await _apiClient.get(path);
    final data = response.data as Map<String, dynamic>;
    final bookingJson = Map<String, dynamic>.from(data['booking'] as Map<String, dynamic>);
    if (data['trip'] is Map<String, dynamic>) {
      bookingJson['trip'] = data['trip'];
    }
    if (data['passenger'] is Map<String, dynamic>) {
      bookingJson['passenger'] = data['passenger'];
    }
    return Booking.fromJson(bookingJson);
  }

  Future<Booking> confirmBooking(String id, {String? paymentMethod}) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.bookingConfirm, {'id': id});
    final response = await _apiClient.post(path, data: {
      if (paymentMethod != null) 'paymentMethod': paymentMethod,
    });
    return Booking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Booking> cancelBooking(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.bookingCancel, {'id': id});
    final response = await _apiClient.post(path);
    return Booking.fromJson(response.data as Map<String, dynamic>);
  }

  // Boarding
  Future<Map<String, dynamic>> scanTicket(String qrCodeData, {String? tripId}) async {
    final response = await _apiClient.post(
      ApiEndpoints.boardingScan,
      data: {'qrCodeData': qrCodeData, if (tripId != null) 'tripId': tripId},
    );
    return response.data as Map<String, dynamic>;
  }

  /// Lists all active drivers for trip assignment (operator).
  Future<List<User>> getDrivers() async {
    final response = await _apiClient.get(ApiEndpoints.drivers);
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((e) => User.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Booking> markBoarded(String bookingId) async {
    final response = await _apiClient.post(
      ApiEndpoints.boardingBoard,
      data: {'bookingId': bookingId},
    );
    return Booking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Booking> markDroppedOff(String bookingId) async {
    final response = await _apiClient.post(
      ApiEndpoints.boardingDropoff,
      data: {'bookingId': bookingId},
    );
    return Booking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Manifest> getBoardingManifest(String tripId) async {
    final response = await _apiClient.get(
      ApiEndpoints.boardingManifest,
      queryParameters: {'tripId': tripId},
    );
    return Manifest.fromJson(response.data as Map<String, dynamic>);
  }

  // Emergency
  Future<EmergencyReport> reportEmergency({
    required String emergencyType,
    String? description,
    String? location,
    String? tripId,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.emergency,
      data: {
        'emergencyType': emergencyType,
        if (description != null) 'description': description,
        if (location != null) 'location': location,
        if (tripId != null) 'tripId': tripId,
      },
    );
    return EmergencyReport.fromJson(response.data as Map<String, dynamic>);
  }

  // Admin
  Future<List<dynamic>> getPendingCompanies() async {
    final response = await _apiClient.get(ApiEndpoints.adminCompaniesPending);
    return response.data as List<dynamic>;
  }

  /// All buses with approval status (admin review). Optional status filter:
  /// PENDING, APPROVED or REJECTED.
  Future<List<Bus>> getAdminBuses({String? status}) async {
    final response = await _apiClient.get(
      ApiEndpoints.adminBuses,
      queryParameters: status != null ? {'status': status} : null,
    );
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((e) => Bus.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> approveBus(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.adminBusApprove, {'id': id});
    await _apiClient.post(path);
  }

  Future<void> rejectBus(String id, {String? reason}) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.adminBusReject, {'id': id});
    await _apiClient.post(path, data: {if (reason != null) 'reason': reason});
  }

  /// All routes with approval status (admin review). Optional status filter:
  /// PENDING, APPROVED or REJECTED.
  Future<List<Route>> getAdminRoutes({String? status}) async {
    final response = await _apiClient.get(
      ApiEndpoints.adminRoutes,
      queryParameters: status != null ? {'status': status} : null,
    );
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((e) => Route.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> approveRoute(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.adminRouteApprove, {'id': id});
    await _apiClient.post(path);
  }

  Future<void> rejectRoute(String id, {String? reason}) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.adminRouteReject, {'id': id});
    await _apiClient.post(path, data: {if (reason != null) 'reason': reason});
  }

  Future<Map<String, dynamic>> approveCompany(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.adminCompanyApprove, {'id': id});
    final response = await _apiClient.post(path);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> rejectCompany(String id) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.adminCompanyReject, {'id': id});
    final response = await _apiClient.post(path);
    return response.data as Map<String, dynamic>;
  }

  Future<List<User>> getAllUsers({String? role, int page = 1, int limit = 50}) async {
    final queryParams = <String, dynamic>{
      if (role != null) 'role': role,
      'page': page,
      'limit': limit,
    };
    final response = await _apiClient.get(ApiEndpoints.adminUsers, queryParameters: queryParams);
    final data = response.data as Map<String, dynamic>;
    final List<dynamic> usersData = data['users'] as List<dynamic>;
    return usersData.map((e) => User.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<User> updateUserRole(String id, String role) async {
    final path = _apiClient.replacePathParams(ApiEndpoints.adminUserRole, {'id': id});
    final response = await _apiClient.put(path, data: {'role': role});
    return User.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Analytics> getAnalytics() async {
    final response = await _apiClient.get(ApiEndpoints.adminAnalytics);
    return Analytics.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateCommission(double rate) async {
    final response = await _apiClient.put(
      ApiEndpoints.adminCommission,
      data: {'commissionRate': rate},
    );
    return response.data as Map<String, dynamic>;
  }

  // Admin Settings
  Future<Map<String, dynamic>> getSettings() async {
    final response = await _apiClient.get(ApiEndpoints.adminSettings);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> updates) async {
    final response = await _apiClient.put(
      ApiEndpoints.adminSettings,
      data: updates,
    );
    return response.data as Map<String, dynamic>;
  }

  // Operator
  Future<Map<String, dynamic>> registerCompany({
    required String companyName,
    String? registrationNumber,
    String? contactEmail,
    String? contactPhone,
  }) async {
    final response = await _apiClient.post(
      ApiEndpoints.operatorRegisterCompany,
      data: {
        'companyName': companyName,
        if (registrationNumber != null) 'registrationNumber': registrationNumber,
        if (contactEmail != null) 'contactEmail': contactEmail,
        if (contactPhone != null) 'contactPhone': contactPhone,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> getMyCompany() async {
    final response = await _apiClient.get(ApiEndpoints.operatorMyCompany);
    final data = response.data;
    if (data == null) return null;
    return data as Map<String, dynamic>;
  }
}
