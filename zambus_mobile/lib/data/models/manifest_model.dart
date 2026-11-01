import 'package:equatable/equatable.dart';

class Manifest extends Equatable {
  final TripInfo trip;
  final List<ManifestPassenger> passengers;
  final ManifestTotals totals;

  const Manifest({
    required this.trip,
    required this.passengers,
    required this.totals,
  });

  factory Manifest.fromJson(Map<String, dynamic> json) {
    return Manifest(
      trip: TripInfo.fromJson(json['trip'] as Map<String, dynamic>),
      passengers: (json['passengers'] as List<dynamic>)
          .map((p) => ManifestPassenger.fromJson(p as Map<String, dynamic>))
          .toList(),
      totals: ManifestTotals.fromJson(json['totals'] as Map<String, dynamic>),
    );
  }

  @override
  List<Object?> get props => [trip, passengers, totals];
}

class TripInfo extends Equatable {
  final String tripId;
  final String? routeName;
  final String? origin;
  final String? destination;
  final DateTime departureTime;
  final String? busReg;
  final String? busModel;

  const TripInfo({
    required this.tripId,
    this.routeName,
    this.origin,
    this.destination,
    required this.departureTime,
    this.busReg,
    this.busModel,
  });

  factory TripInfo.fromJson(Map<String, dynamic> json) {
    return TripInfo(
      tripId: json['tripId'] as String,
      routeName: json['routeName'] as String?,
      origin: json['origin'] as String?,
      destination: json['destination'] as String?,
      departureTime: DateTime.parse(json['departureTime'] as String),
      busReg: json['busReg'] as String?,
      busModel: json['busModel'] as String?,
    );
  }

  @override
  List<Object?> get props => [tripId, routeName, origin, destination, departureTime, busReg, busModel];
}

class ManifestPassenger extends Equatable {
  final String bookingId;
  final int seatNumber;
  final String passengerName;
  final String? passengerPhone;
  final String qrCodeData;
  final String boardingStatus;
  final String paymentStatus;

  const ManifestPassenger({
    required this.bookingId,
    required this.seatNumber,
    required this.passengerName,
    this.passengerPhone,
    required this.qrCodeData,
    required this.boardingStatus,
    required this.paymentStatus,
  });

  factory ManifestPassenger.fromJson(Map<String, dynamic> json) {
    return ManifestPassenger(
      bookingId: json['bookingId'] as String,
      seatNumber: json['seatNumber'] as int,
      passengerName: json['passengerName'] as String,
      passengerPhone: json['passengerPhone'] as String?,
      qrCodeData: json['qrCodeData'] as String,
      boardingStatus: json['boardingStatus'] as String,
      paymentStatus: json['paymentStatus'] as String,
    );
  }

  bool get isBoarded => boardingStatus == 'BOARDED';
  bool get isNotBoarded => boardingStatus == 'NOT_BOARDED';
  bool get isDroppedOff => boardingStatus == 'DROPPED_OFF';

  @override
  List<Object?> get props => [bookingId, seatNumber, passengerName, passengerPhone, qrCodeData, boardingStatus, paymentStatus];
}

class ManifestTotals extends Equatable {
  final int totalPassengers;
  final int boarded;
  final int notBoarded;
  final int droppedOff;

  const ManifestTotals({
    required this.totalPassengers,
    required this.boarded,
    required this.notBoarded,
    required this.droppedOff,
  });

  factory ManifestTotals.fromJson(Map<String, dynamic> json) {
    return ManifestTotals(
      totalPassengers: json['totalPassengers'] as int,
      boarded: json['boarded'] as int,
      notBoarded: json['notBoarded'] as int,
      droppedOff: json['droppedOff'] as int,
    );
  }

  @override
  List<Object?> get props => [totalPassengers, boarded, notBoarded, droppedOff];
}
