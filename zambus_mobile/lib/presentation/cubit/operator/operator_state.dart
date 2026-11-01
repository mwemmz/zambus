import 'package:equatable/equatable.dart';
import '../../../data/models/models.dart';

abstract class OperatorState extends Equatable {
  const OperatorState();
  
  @override
  List<Object?> get props => [];
}

class OperatorInitial extends OperatorState {}

class DriversLoaded extends OperatorState {
  final List<User> drivers;

  const DriversLoaded(this.drivers);

  @override
  List<Object?> get props => [drivers];
}

class OperatorDataLoaded extends OperatorState {
  final List<Bus> buses;
  final List<Route> routes;
  final List<User> drivers;

  const OperatorDataLoaded({
    required this.buses,
    required this.routes,
    required this.drivers,
  });

  @override
  List<Object?> get props => [buses, routes, drivers];
}

class BusesLoading extends OperatorState {}

class BusesLoaded extends OperatorState {
  final List<Bus> buses;

  const BusesLoaded(this.buses);

  @override
  List<Object?> get props => [buses];
}

class RoutesLoading extends OperatorState {}

class RoutesLoaded extends OperatorState {
  final List<Route> routes;

  const RoutesLoaded(this.routes);

  @override
  List<Object?> get props => [routes];
}

class TripsLoading extends OperatorState {}

class TripsLoaded extends OperatorState {
  final List<Trip> trips;

  const TripsLoaded(this.trips);

  @override
  List<Object?> get props => [trips];
}

class AnalyticsLoading extends OperatorState {}

class AnalyticsLoaded extends OperatorState {
  final Analytics analytics;

  const AnalyticsLoaded(this.analytics);

  @override
  List<Object?> get props => [analytics];
}

class OperatorError extends OperatorState {
  final String message;

  const OperatorError(this.message);

  @override
  List<Object?> get props => [message];
}

class BusCreated extends OperatorState {
  final Bus bus;

  const BusCreated(this.bus);

  @override
  List<Object?> get props => [bus];
}

class RouteCreated extends OperatorState {
  final Route route;

  const RouteCreated(this.route);

  @override
  List<Object?> get props => [route];
}

class TripCreated extends OperatorState {
  final Trip trip;

  const TripCreated(this.trip);

  @override
  List<Object?> get props => [trip];
}

class CompanyLoaded extends OperatorState {
  final dynamic company;

  const CompanyLoaded(this.company);

  @override
  List<Object?> get props => [company];
}

class CompanyRegistered extends OperatorState {
  final Map<String, dynamic> company;

  const CompanyRegistered(this.company);

  @override
  List<Object?> get props => [company];
}
