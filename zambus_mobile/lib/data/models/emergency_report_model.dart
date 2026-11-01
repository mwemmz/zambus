import 'package:equatable/equatable.dart';
import 'user_model.dart';
import 'trip_model.dart';

class EmergencyReport extends Equatable {
  final String reportId;
  final String? tripId;
  final String? driverId;
  final String emergencyType;
  final String? description;
  final String? location;
  final DateTime createdAt;
  
  // Nested objects
  final User? driver;
  final Trip? trip;

  const EmergencyReport({
    required this.reportId,
    this.tripId,
    this.driverId,
    required this.emergencyType,
    this.description,
    this.location,
    required this.createdAt,
    this.driver,
    this.trip,
  });

  factory EmergencyReport.fromJson(Map<String, dynamic> json) {
    return EmergencyReport(
      reportId: json['reportId'] as String,
      tripId: json['tripId'] as String?,
      driverId: json['driverId'] as String?,
      emergencyType: json['emergencyType'] as String,
      description: json['description'] as String?,
      location: json['location'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      driver: json['driver'] != null ? User.fromJson(json['driver'] as Map<String, dynamic>) : null,
      trip: json['trip'] != null ? Trip.fromJson(json['trip'] as Map<String, dynamic>) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'reportId': reportId,
      'tripId': tripId,
      'driverId': driverId,
      'emergencyType': emergencyType,
      'description': description,
      'location': location,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  bool get isBreakdown => emergencyType == 'BREAKDOWN';
  bool get isAccident => emergencyType == 'ACCIDENT';
  bool get isSevereDelay => emergencyType == 'SEVERE_DELAY';

  String get icon {
    switch (emergencyType) {
      case 'BREAKDOWN':
        return '🚗';
      case 'ACCIDENT':
        return '⚠️';
      case 'SEVERE_DELAY':
        return '⏰';
      default:
        return '❗';
    }
  }

  @override
  List<Object?> get props => [reportId, tripId, driverId, emergencyType, description, location, createdAt];
}
