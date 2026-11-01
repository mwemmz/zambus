import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/utils/error_messages.dart';
import '../../../data/datasources/api_datasource.dart';
import 'driver_state.dart';

class DriverCubit extends Cubit<DriverState> {
  final ApiDatasource _datasource;
  DriverCubit(this._datasource) : super(DriverInitial());

  String? _lastTripId;

  /// Loads the trips assigned to the currently logged-in driver.
  Future<void> loadMyTrips() async {
    try {
      emit(MyTripsLoading());
      final trips = await _datasource.getMyAssignedTrips();
      emit(MyTripsLoaded(trips));
    } catch (e) {
      emit(DriverError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadManifest(String tripId) async {
    try {
      _lastTripId = tripId;
      emit(ManifestLoading());
      final manifest = await _datasource.getBoardingManifest(tripId);
      emit(ManifestLoaded(manifest));
    } catch (e) {
      emit(DriverError(ErrorMessages.from(e)));
    }
  }

  Future<void> refreshManifest() async {
    if (_lastTripId != null) {
      await loadManifest(_lastTripId!);
    }
  }

  Future<void> scanTicket(String qrCodeData, {String? tripId}) async {
    try {
      emit(Scanning());
      final result = await _datasource.scanTicket(qrCodeData, tripId: tripId);
      // Backend nests booking details under 'booking'.
      final booking = result['booking'] as Map<String, dynamic>?;
      emit(ScanResult(
        valid: result['valid'] as bool? ?? false,
        status: result['status'] as String? ?? 'UNKNOWN',
        message: result['message'] as String? ?? '',
        bookingId: booking?['bookingId'] as String?,
        seatNumber: (booking?['seatNumber'] as num?)?.toInt(),
      ));
    } catch (e) {
      emit(DriverError(ErrorMessages.from(e)));
    }
  }

  Future<void> markAsBoarded(String bookingId) async {
    try {
      emit(MarkingBoarded());
      await _datasource.markBoarded(bookingId);
      emit(BoardingMarked(bookingId));
      // Refresh so the manifest reflects the new status.
      await refreshManifest();
    } catch (e) {
      emit(DriverError(ErrorMessages.from(e)));
    }
  }

  Future<void> markAsDroppedOff(String bookingId) async {
    try {
      emit(MarkingBoarded());
      await _datasource.markDroppedOff(bookingId);
      emit(BoardingMarked(bookingId));
      await refreshManifest();
    } catch (e) {
      emit(DriverError(ErrorMessages.from(e)));
    }
  }

  Future<void> reportEmergency({
    required String emergencyType,
    String? description,
    String? location,
    String? tripId,
  }) async {
    try {
      emit(EmergencyReporting());
      final report = await _datasource.reportEmergency(
        emergencyType: emergencyType,
        description: description,
        location: location,
        tripId: tripId,
      );
      emit(EmergencyReported(report));
    } catch (e) {
      emit(DriverError(ErrorMessages.from(e)));
    }
  }
}
