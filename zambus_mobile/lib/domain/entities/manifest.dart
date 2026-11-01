class ManifestEntity {
  final ManifestTripInfo? trip;
  final List<ManifestPassenger> passengers;
  final ManifestTotals totals;

  const ManifestEntity({
    this.trip,
    this.passengers = const [],
    required this.totals,
  });
}

class ManifestTripInfo {
  final String? tripId;
  final String? routeName;
  final String? origin;
  final String? destination;
  final DateTime? departureTime;
  final String? busReg;
  final String? busModel;

  const ManifestTripInfo({
    this.tripId,
    this.routeName,
    this.origin,
    this.destination,
    this.departureTime,
    this.busReg,
    this.busModel,
  });
}

class ManifestPassenger {
  final String bookingId;
  final int seatNumber;
  final String passengerName;
  final String passengerPhone;
  final String boardingStatus;
  final String paymentStatus;

  const ManifestPassenger({
    required this.bookingId,
    required this.seatNumber,
    required this.passengerName,
    this.passengerPhone = '',
    required this.boardingStatus,
    required this.paymentStatus,
  });

  bool get isBoarded => boardingStatus == 'BOARDED';
  bool get isNotBoarded => boardingStatus == 'NOT_BOARDED';
  bool get isDroppedOff => boardingStatus == 'DROPPED_OFF';
}

class ManifestTotals {
  final int totalPassengers;
  final int boarded;
  final int notBoarded;
  final int droppedOff;

  const ManifestTotals({
    this.totalPassengers = 0,
    this.boarded = 0,
    this.notBoarded = 0,
    this.droppedOff = 0,
  });

  double get boardingRate =>
      totalPassengers > 0 ? boarded / totalPassengers : 0.0;
}
