import 'package:equatable/equatable.dart';
import 'bus_model.dart';
import 'route_model.dart';

class Trip extends Equatable {
  final String tripId;
  final String? busId;
  final String? routeId;
  final String? driverId;
  final DateTime departureTime;
  final DateTime estimatedArrival;
  final double fareAmount;
  final String status;
  final bool isRecurring;
  final String? recurrencePattern;
  final DateTime? createdAt;

  // Nested objects (included by backend on search/getById)
  final Bus? bus;
  final Route? route;

  // Backend-computed fields (search endpoint)
  final int? remainingSeats;
  final String? busCategory;

  const Trip({
    required this.tripId,
    this.busId,
    this.routeId,
    this.driverId,
    required this.departureTime,
    required this.estimatedArrival,
    required this.fareAmount,
    this.status = 'SCHEDULED',
    this.isRecurring = false,
    this.recurrencePattern,
    this.createdAt,
    this.bus,
    this.route,
    this.remainingSeats,
    this.busCategory,
  });

  /// Parse a fare that may arrive as num (double) or String (Postgres DECIMAL
  /// is serialized as a string by node-postgres).
  static double _parseFare(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      tripId: json['tripId'] as String,
      busId: json['busId'] as String?,
      routeId: json['routeId'] as String?,
      driverId: json['driverId'] as String?,
      departureTime: DateTime.tryParse(json['departureTime'] as String? ?? '') ?? DateTime.now(),
      estimatedArrival: DateTime.tryParse(json['estimatedArrival'] as String? ?? '') ?? DateTime.now(),
      fareAmount: _parseFare(json['fareAmount']),
      status: json['status'] as String? ?? 'SCHEDULED',
      isRecurring: json['isRecurring'] as bool? ?? false,
      recurrencePattern: json['recurrencePattern'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
      bus: json['bus'] != null && json['bus'] is Map<String, dynamic>
          ? Bus.fromJson(json['bus'] as Map<String, dynamic>)
          : null,
      route: json['route'] != null && json['route'] is Map<String, dynamic>
          ? Route.fromJson(json['route'] as Map<String, dynamic>)
          : null,
      remainingSeats: (json['remainingSeats'] as num?)?.toInt(),
      busCategory: json['busCategory'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tripId': tripId,
      'busId': busId,
      'routeId': routeId,
      'driverId': driverId,
      'departureTime': departureTime.toIso8601String(),
      'estimatedArrival': estimatedArrival.toIso8601String(),
      'fareAmount': fareAmount,
      'status': status,
      'isRecurring': isRecurring,
      'recurrencePattern': recurrencePattern,
      'createdAt': createdAt?.toIso8601String(),
      'bus': bus?.toJson(),
      'route': route?.toJson(),
      'remainingSeats': remainingSeats,
      'busCategory': busCategory,
    };
  }

  bool get isScheduled => status == 'SCHEDULED';
  bool get isBoarding => status == 'BOARDING';
  bool get isInTransit => status == 'IN_TRANSIT';
  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED';
  bool get canBook => isScheduled || isBoarding;

  String? get origin => route?.origin;
  String? get destination => route?.destination;
  String? get routeName => route?.routeName;
  String? get busRegistration => bus?.registrationNumber;
  String? get busModel => bus?.model;

  /// Human-friendly route label, mirroring [BookingTripInfo.routeDisplay].
  String get routeDisplay =>
      (origin != null && destination != null) ? '$origin - $destination' : (routeName ?? 'Trip');

  @override
  List<Object?> get props => [tripId, busId, routeId, driverId, departureTime, estimatedArrival, fareAmount, status];
}
