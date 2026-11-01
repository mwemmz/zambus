import 'package:equatable/equatable.dart';

class Route extends Equatable {
  final String routeId;
  final String? companyId;
  final String routeName;
  final String origin;
  final String destination;
  final List<String> intermediateStops;
  final int? estimatedTravelTime;
  final String approvalStatus;
  final String? rejectionReason;
  final DateTime? createdAt;

  const Route({
    required this.routeId,
    this.companyId,
    required this.routeName,
    required this.origin,
    required this.destination,
    this.intermediateStops = const [],
    this.estimatedTravelTime,
    this.approvalStatus = 'PENDING',
    this.rejectionReason,
    this.createdAt,
  });

  factory Route.fromJson(Map<String, dynamic> json) {
    return Route(
      routeId: json['routeId'] as String,
      companyId: json['companyId'] as String?,
      routeName: json['routeName'] as String? ?? '${json['origin'] ?? ''} - ${json['destination'] ?? ''}',
      origin: json['origin'] as String? ?? '',
      destination: json['destination'] as String? ?? '',
      intermediateStops: (json['intermediateStops'] as List<dynamic>?)?.whereType<String>().toList() ?? [],
      estimatedTravelTime: (json['estimatedTravelTime'] as num?)?.toInt(),
      approvalStatus: json['approvalStatus'] as String? ?? 'PENDING',
      rejectionReason: json['rejectionReason'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'routeId': routeId,
      'companyId': companyId,
      'routeName': routeName,
      'origin': origin,
      'destination': destination,
      'intermediateStops': intermediateStops,
      'estimatedTravelTime': estimatedTravelTime,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  String get displayName => '$origin - $destination';
  bool get isApproved => approvalStatus == 'APPROVED';
  bool get isPending => approvalStatus == 'PENDING';
  bool get isRejected => approvalStatus == 'REJECTED';

  @override
  List<Object?> get props => [routeId, routeName, origin, destination, intermediateStops, estimatedTravelTime, approvalStatus];
}
