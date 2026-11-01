import 'package:equatable/equatable.dart';
import '../../../data/models/models.dart';

abstract class DriverState extends Equatable {
  const DriverState();
  
  @override
  List<Object?> get props => [];
}

class DriverInitial extends DriverState {}

/// Emitted while fetching the trips assigned to the logged-in driver.
class MyTripsLoading extends DriverState {}

/// The logged-in driver's assigned trips.
class MyTripsLoaded extends DriverState {
  final List<Trip> trips;

  const MyTripsLoaded(this.trips);

  @override
  List<Object?> get props => [trips];
}

class ManifestLoading extends DriverState {}

class ManifestLoaded extends DriverState {
  final Manifest manifest;

  const ManifestLoaded(this.manifest);

  @override
  List<Object?> get props => [manifest];
}

class Scanning extends DriverState {}

class ScanResult extends DriverState {
  final bool valid;
  final String status;
  final String message;
  final String? bookingId;
  final int? seatNumber;

  const ScanResult({
    required this.valid,
    required this.status,
    required this.message,
    this.bookingId,
    this.seatNumber,
  });

  @override
  List<Object?> get props => [valid, status, message, bookingId, seatNumber];
}

class MarkingBoarded extends DriverState {}

class BoardingMarked extends DriverState {
  final String bookingId;

  const BoardingMarked(this.bookingId);

  @override
  List<Object?> get props => [bookingId];
}

class EmergencyReporting extends DriverState {}

class EmergencyReported extends DriverState {
  final EmergencyReport report;

  const EmergencyReported(this.report);

  @override
  List<Object?> get props => [report];
}

class DriverError extends DriverState {
  final String message;

  const DriverError(this.message);

  @override
  List<Object?> get props => [message];
}
