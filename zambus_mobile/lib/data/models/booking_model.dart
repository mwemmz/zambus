import 'dart:convert';
import 'package:equatable/equatable.dart';

class Booking extends Equatable {
  final String bookingId;
  final String tripId;
  final String? passengerId;
  final int seatNumber;
  final String qrCodeData;
  final String paymentStatus;
  final String boardingStatus;
  final DateTime? createdAt;

  // Nested trip info (backend returns a flat summary object, not a full Trip)
  final BookingTripInfo? trip;

  // Passenger info (returned by GET /bookings/:id)
  final String? passengerName;

  const Booking({
    required this.bookingId,
    required this.tripId,
    this.passengerId,
    required this.seatNumber,
    required this.qrCodeData,
    this.paymentStatus = 'PENDING',
    this.boardingStatus = 'NOT_BOARDED',
    this.createdAt,
    this.trip,
    this.passengerName,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      bookingId: json['bookingId'] as String,
      tripId: json['tripId'] as String? ?? '',
      passengerId: json['passengerId'] as String?,
      seatNumber: (json['seatNumber'] as num?)?.toInt() ?? 0,
      qrCodeData: json['qrCodeData'] as String? ?? '',
      paymentStatus: json['paymentStatus'] as String? ?? 'PENDING',
      boardingStatus: json['boardingStatus'] as String? ?? 'NOT_BOARDED',
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
      trip: json['trip'] is Map<String, dynamic>
          ? BookingTripInfo.fromJson(json['trip'] as Map<String, dynamic>)
          : null,
      passengerName: json['passenger'] is Map<String, dynamic>
          ? (json['passenger']['fullName'] as String?)
          : json['passengerName'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'bookingId': bookingId,
      'tripId': tripId,
      'passengerId': passengerId,
      'seatNumber': seatNumber,
      'qrCodeData': qrCodeData,
      'paymentStatus': paymentStatus,
      'boardingStatus': boardingStatus,
      'createdAt': createdAt?.toIso8601String(),
      'trip': trip?.toJson(),
      'passengerName': passengerName,
    };
  }

  bool get isPending => paymentStatus == 'PENDING';
  bool get isConfirmed => paymentStatus == 'CONFIRMED';
  bool get isRefunded => paymentStatus == 'REFUNDED';
  bool get canCancel => isConfirmed && boardingStatus == 'NOT_BOARDED';

  bool get notBoarded => boardingStatus == 'NOT_BOARDED';
  bool get boarded => boardingStatus == 'BOARDED';
  bool get droppedOff => boardingStatus == 'DROPPED_OFF';

  String? get ticketId {
    try {
      final data = jsonDecode(qrCodeData) as Map<String, dynamic>;
      return data['bookingId'] as String?;
    } catch (_) {
      return null;
    }
  }

  String? get fareDisplay {
    if (trip == null) return null;
    final fare = trip!.fareAmount;
    if (fare == null) return null;
    return 'K${fare.toStringAsFixed(2)}';
  }

  @override
  List<Object?> get props => [bookingId, tripId, seatNumber, qrCodeData, paymentStatus, boardingStatus, passengerName];
}

/// Flat trip summary returned with bookings (booking controller response shape).
class BookingTripInfo extends Equatable {
  final String tripId;
  final String? routeName;
  final String? origin;
  final String? destination;
  final DateTime? departureTime;
  final DateTime? estimatedArrival;
  final double? fareAmount;
  final String? busReg;
  final String? busModel;

  const BookingTripInfo({
    required this.tripId,
    this.routeName,
    this.origin,
    this.destination,
    this.departureTime,
    this.estimatedArrival,
    this.fareAmount,
    this.busReg,
    this.busModel,
  });

  factory BookingTripInfo.fromJson(Map<String, dynamic> json) {
    return BookingTripInfo(
      tripId: json['tripId'] as String,
      routeName: json['routeName'] as String?,
      origin: json['origin'] as String?,
      destination: json['destination'] as String?,
      departureTime: json['departureTime'] != null ? DateTime.tryParse(json['departureTime'] as String) : null,
      estimatedArrival: json['estimatedArrival'] != null ? DateTime.tryParse(json['estimatedArrival'] as String) : null,
      fareAmount: json['fareAmount'] == null
          ? null
          : json['fareAmount'] is num
              ? (json['fareAmount'] as num).toDouble()
              : double.tryParse(json['fareAmount'].toString()),
      busReg: json['busReg'] as String?,
      busModel: json['busModel'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tripId': tripId,
      'routeName': routeName,
      'origin': origin,
      'destination': destination,
      'departureTime': departureTime?.toIso8601String(),
      'estimatedArrival': estimatedArrival?.toIso8601String(),
      'fareAmount': fareAmount,
      'busReg': busReg,
      'busModel': busModel,
    };
  }

  String get routeDisplay =>
      (origin != null && destination != null) ? '$origin - $destination' : (routeName ?? 'Trip');

  @override
  List<Object?> get props => [tripId, routeName, origin, destination, departureTime, fareAmount, busReg];
}
