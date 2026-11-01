class TripEntity {
  final String tripId;
  final String? routeId;
  final String? busId;
  final String? driverId;
  final DateTime departureTime;
  final DateTime estimatedArrival;
  final double fareAmount;
  final String status;
  final bool isRecurring;
  final String? recurrencePattern;
  final String? routeName;
  final String? origin;
  final String? destination;
  final String? busReg;
  final String? busModel;
  final int? remainingSeats;
  final String? busCategory;

  const TripEntity({
    required this.tripId,
    this.routeId,
    this.busId,
    this.driverId,
    required this.departureTime,
    required this.estimatedArrival,
    required this.fareAmount,
    required this.status,
    this.isRecurring = false,
    this.recurrencePattern,
    this.routeName,
    this.origin,
    this.destination,
    this.busReg,
    this.busModel,
    this.remainingSeats,
    this.busCategory,
  });

  bool get isScheduled => status == 'SCHEDULED';
  bool get isBoarding => status == 'BOARDING';
  bool get isInTransit => status == 'IN_TRANSIT';
  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED';
  bool get canBook => status == 'SCHEDULED' || status == 'BOARDING';
}
