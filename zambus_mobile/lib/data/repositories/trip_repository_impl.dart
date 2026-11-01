import '../../domain/repositories/trip_repository.dart';
import '../../domain/entities/trip.dart';
import '../../domain/entities/manifest.dart' as domain;
import '../datasources/api_datasource.dart';
import '../models/models.dart';
import '../models/manifest_model.dart' as model;

class TripRepositoryImpl implements TripRepository {
  final ApiDatasource _datasource;

  TripRepositoryImpl(this._datasource);

  TripEntity _toEntity(Trip model) {
    return TripEntity(
      tripId: model.tripId,
      routeId: model.routeId,
      busId: model.busId,
      driverId: model.driverId,
      departureTime: model.departureTime,
      estimatedArrival: model.estimatedArrival,
      fareAmount: model.fareAmount,
      status: model.status,
      isRecurring: model.isRecurring,
      recurrencePattern: model.recurrencePattern,
      routeName: model.routeName,
      origin: model.origin,
      destination: model.destination,
      busReg: model.busRegistration,
      busModel: model.busModel,
      remainingSeats: model.remainingSeats,
    );
  }

  domain.ManifestEntity _toManifest(model.Manifest manifest) {
    return domain.ManifestEntity(
      trip: domain.ManifestTripInfo(
        tripId: manifest.trip.tripId,
        routeName: manifest.trip.routeName,
        origin: manifest.trip.origin,
        destination: manifest.trip.destination,
        departureTime: manifest.trip.departureTime,
        busReg: manifest.trip.busReg,
        busModel: manifest.trip.busModel,
      ),
      passengers: manifest.passengers
          .map((p) => domain.ManifestPassenger(
                bookingId: p.bookingId,
                seatNumber: p.seatNumber,
                passengerName: p.passengerName,
                passengerPhone: p.passengerPhone ?? '',
                boardingStatus: p.boardingStatus,
                paymentStatus: p.paymentStatus,
              ))
          .toList(),
      totals: domain.ManifestTotals(
        totalPassengers: manifest.totals.totalPassengers,
        boarded: manifest.totals.boarded,
        notBoarded: manifest.totals.notBoarded,
        droppedOff: manifest.totals.droppedOff,
      ),
    );
  }

  @override
  Future<List<TripEntity>> searchTrips({
    String? origin,
    String? destination,
    String? travelDate,
    String? filter,
    int page = 1,
    int limit = 20,
  }) async {
    final trips = await _datasource.searchTrips(
      origin: origin,
      destination: destination,
      travelDate: travelDate,
      filter: filter,
      page: page,
      limit: limit,
    );
    return trips.map(_toEntity).toList();
  }

  @override
  Future<TripEntity> getTripById(String id) async {
    final trip = await _datasource.getTripById(id);
    return _toEntity(trip);
  }

  @override
  Future<TripEntity> createTrip({
    required String routeId,
    required String busId,
    required String driverId,
    required DateTime departureTime,
    required DateTime estimatedArrival,
    required double fareAmount,
    bool isRecurring = false,
    String? recurrencePattern,
  }) async {
    final trip = await _datasource.createTrip(
      routeId: routeId,
      busId: busId,
      driverId: driverId,
      departureTime: departureTime,
      estimatedArrival: estimatedArrival,
      fareAmount: fareAmount,
      isRecurring: isRecurring,
      recurrencePattern: recurrencePattern,
    );
    return _toEntity(trip);
  }

  @override
  Future<TripEntity> updateTrip(String id, Map<String, dynamic> updates) async {
    final trip = await _datasource.updateTrip(id, updates);
    return _toEntity(trip);
  }

  @override
  Future<TripEntity> openTrip(String id) async {
    final trip = await _datasource.openTrip(id);
    return _toEntity(trip);
  }

  @override
  Future<TripEntity> closeTrip(String id) async {
    final trip = await _datasource.closeTrip(id);
    return _toEntity(trip);
  }

  @override
  Future<TripEntity> delayTrip(String id, DateTime newDepartureTime) async {
    final trip = await _datasource.delayTrip(id, newDepartureTime);
    return _toEntity(trip);
  }

  @override
  Future<TripEntity> cancelTrip(String id) async {
    final trip = await _datasource.cancelTrip(id);
    return _toEntity(trip);
  }

  @override
  Future<domain.ManifestEntity> getTripManifest(String tripId) async {
    final manifest = await _datasource.getTripManifest(tripId);
    return _toManifest(manifest);
  }

  @override
  Future<Map<String, dynamic>> getTripSeats(String tripId) async {
    final seatMap = await _datasource.getTripSeats(tripId);
    return {
      'tripId': seatMap.tripId,
      'busCapacity': seatMap.busCapacity,
      'availableSeats': seatMap.availableSeats,
    };
  }
}
