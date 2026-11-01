import '../entities/booking.dart';

abstract class BookingRepository {
  Future<BookingEntity> createBooking({
    required String tripId,
    required int seatNumber,
  });

  Future<BookingEntity> createAndConfirmBooking({
    required String tripId,
    required int seatNumber,
  });

  Future<List<BookingEntity>> getMyBookings();

  Future<BookingEntity> getBookingById(String id);

  Future<BookingEntity> confirmBooking(String id, {String? paymentMethod});

  Future<BookingEntity> cancelBooking(String id);
}
