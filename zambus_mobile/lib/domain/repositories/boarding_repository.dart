import '../entities/booking.dart';
import '../entities/manifest.dart';

abstract class BoardingRepository {
  Future<Map<String, dynamic>> scanTicket(String qrCodeData, {String? tripId});

  Future<BookingEntity> markBoarded(String bookingId);

  Future<BookingEntity> markDroppedOff(String bookingId);

  Future<ManifestEntity> getBoardingManifest(String tripId);
}
