import '../../domain/repositories/boarding_repository.dart';
import '../../domain/entities/booking.dart';
import '../../domain/entities/manifest.dart' as domain;
import '../datasources/api_datasource.dart';
import '../models/models.dart';

class BoardingRepositoryImpl implements BoardingRepository {
  final ApiDatasource _datasource;

  BoardingRepositoryImpl(this._datasource);

  @override
  Future<Map<String, dynamic>> scanTicket(String qrCodeData, {String? tripId}) async {
    return await _datasource.scanTicket(qrCodeData, tripId: tripId);
  }

  @override
  Future<BookingEntity> markBoarded(String bookingId) async {
    final booking = await _datasource.markBoarded(bookingId);
    return BookingEntity(
      bookingId: booking.bookingId,
      tripId: booking.tripId,
      passengerId: booking.passengerId ?? '',
      seatNumber: booking.seatNumber,
      qrCodeData: booking.qrCodeData,
      paymentStatus: booking.paymentStatus,
      boardingStatus: booking.boardingStatus,
      createdAt: booking.createdAt,
    );
  }

  @override
  Future<BookingEntity> markDroppedOff(String bookingId) async {
    final booking = await _datasource.markDroppedOff(bookingId);
    return BookingEntity(
      bookingId: booking.bookingId,
      tripId: booking.tripId,
      passengerId: booking.passengerId ?? '',
      seatNumber: booking.seatNumber,
      qrCodeData: booking.qrCodeData,
      paymentStatus: booking.paymentStatus,
      boardingStatus: booking.boardingStatus,
      createdAt: booking.createdAt,
    );
  }

  @override
  Future<domain.ManifestEntity> getBoardingManifest(String tripId) async {
    final manifest = await _datasource.getBoardingManifest(tripId);
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
}
