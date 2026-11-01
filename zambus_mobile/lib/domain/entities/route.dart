class RouteEntity {
  final String routeId;
  final String companyId;
  final String routeName;
  final String origin;
  final String destination;
  final List<String> intermediateStops;
  final int? estimatedTravelTime;
  final DateTime? createdAt;

  const RouteEntity({
    required this.routeId,
    required this.companyId,
    required this.routeName,
    required this.origin,
    required this.destination,
    this.intermediateStops = const [],
    this.estimatedTravelTime,
    this.createdAt,
  });
}
