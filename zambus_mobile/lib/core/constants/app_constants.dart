class AppConstants {
  // API
  static const String baseUrl = 'http://64.227.39.246:3050/api';
  static const int connectionTimeout = 30000;
  static const int receiveTimeout = 30000;

  // Storage keys
  static const String authTokenKey = 'auth_token';
  static const String userKey = 'user_data';

  // Seat layout
  static const int defaultBusCapacity = 40;
  static const int seatsPerRow = 4;
  static const int aisleSeat = 2; // Seat position for aisle

  // Routes
  static const int passengerSeatStart = 1; // Where passenger seats start
  static const int driverSeatNumber = 0; // Driver seat

  // Trip filters
  static const String filterLowestPrice = 'lowestPrice';
  static const String filterEarliestDeparture = 'earliestDeparture';
  static const String filterLuxury = 'luxury';
  static const String filterSemiLuxury = 'semiLuxury';
  static const String filterStandard = 'standard';
}
