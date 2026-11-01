import '../entities/trip.dart';
import '../entities/manifest.dart';

abstract class TripRepository {
  Future<List<TripEntity>> searchTrips({
    String? origin,
    String? destination,
    String? travelDate,
    String? filter,
    int page = 1,
    int limit = 20,
  });

  Future<TripEntity> getTripById(String id);

  Future<TripEntity> createTrip({
    required String routeId,
    required String busId,
    required String driverId,
    required DateTime departureTime,
    required DateTime estimatedArrival,
    required double fareAmount,
    bool isRecurring = false,
    String? recurrencePattern,
  });

  Future<TripEntity> updateTrip(String id, Map<String, dynamic> updates);

  Future<TripEntity> openTrip(String id);

  Future<TripEntity> closeTrip(String id);

  Future<TripEntity> delayTrip(String id, DateTime newDepartureTime);

  Future<TripEntity> cancelTrip(String id);

  Future<ManifestEntity> getTripManifest(String tripId);

  Future<Map<String, dynamic>> getTripSeats(String tripId);
}
