import 'package:equatable/equatable.dart';

class Analytics extends Equatable {
  final int totalUsers;
  final int totalOperators;
  final int totalBuses;
  final int totalRoutes;
  final int totalActiveTrips;
  final int totalBookings;
  final double totalRevenue;
  final double commissionAmount;
  final double netPayout;

  const Analytics({
    required this.totalUsers,
    required this.totalOperators,
    this.totalBuses = 0,
    this.totalRoutes = 0,
    required this.totalActiveTrips,
    required this.totalBookings,
    required this.totalRevenue,
    required this.commissionAmount,
    required this.netPayout,
  });

  factory Analytics.fromJson(Map<String, dynamic> json) {
    return Analytics(
      totalUsers: (json['totalUsers'] as num?)?.toInt() ?? 0,
      totalOperators: (json['totalOperators'] as num?)?.toInt() ?? 0,
      totalBuses: (json['totalBuses'] as num?)?.toInt() ?? 0,
      totalRoutes: (json['totalRoutes'] as num?)?.toInt() ?? 0,
      totalActiveTrips: (json['totalActiveTrips'] as num?)?.toInt() ?? 0,
      totalBookings: (json['totalBookings'] as num?)?.toInt() ?? 0,
      totalRevenue: (json['totalRevenue'] as num?)?.toDouble() ?? 0.0,
      commissionAmount: (json['commissionAmount'] as num?)?.toDouble() ?? 0.0,
      netPayout: (json['netPayout'] as num?)?.toDouble() ?? 0.0,
    );
  }

  @override
  List<Object?> get props => [totalUsers, totalOperators, totalBuses, totalRoutes, totalActiveTrips, totalBookings, totalRevenue, commissionAmount, netPayout];
}
