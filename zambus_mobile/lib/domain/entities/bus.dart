class BusEntity {
  final String busId;
  final String companyId;
  final String registrationNumber;
  final String model;
  final int seatCapacity;
  final List<String> amenities;
  final String maintenanceStatus;
  final DateTime? createdAt;

  const BusEntity({
    required this.busId,
    required this.companyId,
    required this.registrationNumber,
    required this.model,
    required this.seatCapacity,
    this.amenities = const [],
    this.maintenanceStatus = 'OPERATIONAL',
    this.createdAt,
  });

  bool get isOperational => maintenanceStatus == 'OPERATIONAL';
  bool get isUnderMaintenance => maintenanceStatus == 'MAINTENANCE';
  bool get isOutOfService => maintenanceStatus == 'OUT_OF_SERVICE';
}
