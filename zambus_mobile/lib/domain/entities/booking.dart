class BookingEntity {
  final String bookingId;
  final String tripId;
  final String passengerId;
  final int seatNumber;
  final String qrCodeData;
  final String paymentStatus;
  final String boardingStatus;
  final DateTime? createdAt;
  final TripSummary? trip;
  final PassengerSummary? passenger;

  const BookingEntity({
    required this.bookingId,
    required this.tripId,
    required this.passengerId,
    required this.seatNumber,
    required this.qrCodeData,
    required this.paymentStatus,
    required this.boardingStatus,
    this.createdAt,
    this.trip,
    this.passenger,
  });

  bool get isPending => paymentStatus == 'PENDING';
  bool get isConfirmed => paymentStatus == 'CONFIRMED';
  bool get isRefunded => paymentStatus == 'REFUNDED';
  bool get isBoarded => boardingStatus == 'BOARDED';
  bool get isNotBoarded => boardingStatus == 'NOT_BOARDED';
  bool get isDroppedOff => boardingStatus == 'DROPPED_OFF';
}

class TripSummary {
  final String? tripId;
  final String? routeName;
  final String? origin;
  final String? destination;
  final DateTime? departureTime;
  final DateTime? estimatedArrival;
  final double? fareAmount;
  final String? busReg;
  final String? busModel;

  const TripSummary({
    this.tripId,
    this.routeName,
    this.origin,
    this.destination,
    this.departureTime,
    this.estimatedArrival,
    this.fareAmount,
    this.busReg,
    this.busModel,
  });
}

class PassengerSummary {
  final String? fullName;
  final String? phoneNumber;
  final String? email;

  const PassengerSummary({
    this.fullName,
    this.phoneNumber,
    this.email,
  });
}
