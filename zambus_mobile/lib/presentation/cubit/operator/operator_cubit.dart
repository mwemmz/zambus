import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/utils/error_messages.dart';
import '../../../data/datasources/api_datasource.dart';
import '../../../data/models/models.dart';
import 'operator_state.dart';

class OperatorCubit extends Cubit<OperatorState> {
  final ApiDatasource _datasource;
  OperatorCubit(this._datasource) : super(OperatorInitial());

  Future<void> loadBuses() async {
    try {
      emit(BusesLoading());
      final buses = await _datasource.getBuses();
      emit(BusesLoaded(buses));
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadRoutes() async {
    try {
      emit(RoutesLoading());
      final routes = await _datasource.getRoutes();
      emit(RoutesLoaded(routes));
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadTrips() async {
    try {
      emit(TripsLoading());
      final trips = await _datasource.searchTrips(limit: 50);
      emit(TripsLoaded(trips));
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  /// Loads drivers for the trip assignment dropdown.
  Future<void> loadDrivers() async {
    try {
      final drivers = await _datasource.getDrivers();
      emit(DriversLoaded(drivers));
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadAll() async {
    try {
      emit(BusesLoading());
      final results = await Future.wait([
        _datasource.getBuses(),
        _datasource.getRoutes(),
        _datasource.getDrivers(),
      ]);
      emit(OperatorDataLoaded(
        buses: results[0] as List<Bus>,
        routes: results[1] as List<Route>,
        drivers: results[2] as List<User>,
      ));
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  /// Check if the operator has a registered and approved company.
  Future<void> loadCompany() async {
    try {
      final company = await _datasource.getMyCompany();
      emit(CompanyLoaded(company));
    } catch (e) {
      emit(CompanyLoaded(null));
    }
  }

  Future<void> registerCompany({
    required String companyName,
    String? registrationNumber,
    String? contactEmail,
    String? contactPhone,
  }) async {
    try {
      final company = await _datasource.registerCompany(
        companyName: companyName,
        registrationNumber: registrationNumber,
        contactEmail: contactEmail,
        contactPhone: contactPhone,
      );
      emit(CompanyRegistered(company));
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadAnalytics() async {
    try {
      emit(AnalyticsLoading());
      final analytics = await _datasource.getAnalytics();
      emit(AnalyticsLoaded(analytics));
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> createBus({
    required String registrationNumber,
    required String model,
    required int seatCapacity,
    List<String>? amenities,
    String? maintenanceStatus,
  }) async {
    try {
      final bus = await _datasource.createBus(
        registrationNumber: registrationNumber,
        model: model,
        seatCapacity: seatCapacity,
        amenities: amenities,
        maintenanceStatus: maintenanceStatus,
      );
      emit(BusCreated(bus));
      await loadBuses();
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> createRoute({
    required String routeName,
    required String origin,
    required String destination,
    List<String>? intermediateStops,
    int? estimatedTravelTime,
  }) async {
    try {
      final route = await _datasource.createRoute(
        routeName: routeName,
        origin: origin,
        destination: destination,
        intermediateStops: intermediateStops,
        estimatedTravelTime: estimatedTravelTime,
      );
      emit(RouteCreated(route));
      await loadRoutes();
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> createTrip({
    required String routeId,
    required String busId,
    required String driverId,
    required DateTime departureTime,
    required DateTime estimatedArrival,
    required double fareAmount,
  }) async {
    try {
      final trip = await _datasource.createTrip(
        routeId: routeId,
        busId: busId,
        driverId: driverId,
        departureTime: departureTime,
        estimatedArrival: estimatedArrival,
        fareAmount: fareAmount,
      );
      emit(TripCreated(trip));
      await loadTrips();
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> updateTripStatus(String tripId, String action) async {
    try {
      switch (action) {
        case 'open':
          await _datasource.openTrip(tripId);
          break;
        case 'close':
          await _datasource.closeTrip(tripId);
          break;
        case 'delay':
          // Delay handled separately with a time picker.
          break;
        case 'cancel':
          await _datasource.cancelTrip(tripId);
          break;
      }
      await loadTrips();
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }

  Future<void> delayTrip(String tripId, DateTime newDepartureTime) async {
    try {
      await _datasource.delayTrip(tripId, newDepartureTime);
      await loadTrips();
    } catch (e) {
      emit(OperatorError(ErrorMessages.from(e)));
    }
  }
}
