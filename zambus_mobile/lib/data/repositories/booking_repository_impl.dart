import '../../domain/repositories/booking_repository.dart';
import '../../domain/entities/booking.dart';
import '../datasources/api_datasource.dart';

class BookingRepositoryImpl implements BookingRepository {
  final ApiDatasource _datasource;

  BookingRepositoryImpl(this._datasource);

  BookingEntity _toEntity(dynamic model) {
    final trip = model.trip;
    final passenger = model.passenger;
    return BookingEntity(
      bookingId: model.bookingId,
      tripId: model.tripId,
      passengerId: model.passengerId,
      seatNumber: model.seatNumber,
      qrCodeData: model.qrCodeData,
      paymentStatus: model.paymentStatus,
      boardingStatus: model.boardingStatus,
      createdAt: model.createdAt,
      trip: trip != null
          ? TripSummary(
              tripId: trip.tripId,
              routeName: trip.routeName,
              origin: trip.origin,
              destination: trip.destination,
              departureTime: trip.departureTime,
              estimatedArrival: trip.estimatedArrival,
              fareAmount: trip.fareAmount,
              busReg: trip.busReg,
              busModel: trip.busModel,
            )
          : null,
      passenger: passenger != null
          ? PassengerSummary(
              fullName: passenger.fullName,
              phoneNumber: passenger.phoneNumber,
              email: passenger.email,
            )
          : null,
    );
  }

  @override
  Future<BookingEntity> createBooking({
    required String tripId,
    required int seatNumber,
  }) async {
    final booking = await _datasource.createBooking(
      tripId: tripId,
      seatNumber: seatNumber,
    );
    return _toEntity(booking);
  }

  @override
  Future<BookingEntity> createAndConfirmBooking({
    required String tripId,
    required int seatNumber,
  }) async {
    final booking = await _datasource.createAndConfirmBooking(
      tripId: tripId,
      seatNumber: seatNumber,
    );
    return _toEntity(booking);
  }

  @override
  Future<List<BookingEntity>> getMyBookings() async {
    final bookings = await _datasource.getMyBookings();
    return bookings.map(_toEntity).toList();
  }

  @override
  Future<BookingEntity> getBookingById(String id) async {
    final booking = await _datasource.getBookingById(id);
    return _toEntity(booking);
  }

  @override
  Future<BookingEntity> confirmBooking(String id, {String? paymentMethod}) async {
    final booking = await _datasource.confirmBooking(id, paymentMethod: paymentMethod);
    return _toEntity(booking);
  }

  @override
  Future<BookingEntity> cancelBooking(String id) async {
    final booking = await _datasource.cancelBooking(id);
    return _toEntity(booking);
  }
}
