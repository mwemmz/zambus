import 'package:equatable/equatable.dart';
import '../../../data/models/models.dart';

abstract class AdminState extends Equatable {
  const AdminState();
  
  @override
  List<Object?> get props => [];
}

class AdminInitial extends AdminState {}

class PendingCompaniesLoading extends AdminState {}

class PendingCompaniesLoaded extends AdminState {
  final List<dynamic> companies;

  const PendingCompaniesLoaded(this.companies);

  @override
  List<Object?> get props => [companies];
}

/// Combined review queue for the Admin Approvals page: pending companies,
/// buses awaiting review, and routes awaiting review.
class ReviewQueueLoaded extends AdminState {
  final List<dynamic> companies;
  final List<Bus> pendingBuses;
  final List<Route> pendingRoutes;

  const ReviewQueueLoaded({
    required this.companies,
    required this.pendingBuses,
    required this.pendingRoutes,
  });

  int get totalPending => companies.length + pendingBuses.length + pendingRoutes.length;

  @override
  List<Object?> get props => [companies, pendingBuses, pendingRoutes];
}

class BusesReviewLoading extends AdminState {}

class BusesReviewLoaded extends AdminState {
  final List<Bus> buses;

  const BusesReviewLoaded(this.buses);

  @override
  List<Object?> get props => [buses];
}

class RoutesReviewLoading extends AdminState {}

class RoutesReviewLoaded extends AdminState {
  final List<Route> routes;

  const RoutesReviewLoaded(this.routes);

  @override
  List<Object?> get props => [routes];
}

class BusApproved extends AdminState {
  final String busId;

  const BusApproved(this.busId);

  @override
  List<Object?> get props => [busId];
}

class BusRejected extends AdminState {
  final String busId;

  const BusRejected(this.busId);

  @override
  List<Object?> get props => [busId];
}

class RouteApproved extends AdminState {
  final String routeId;

  const RouteApproved(this.routeId);

  @override
  List<Object?> get props => [routeId];
}

class RouteRejected extends AdminState {
  final String routeId;

  const RouteRejected(this.routeId);

  @override
  List<Object?> get props => [routeId];
}

class AllUsersLoading extends AdminState {}

class AllUsersLoaded extends AdminState {
  final List<User> users;
  final int total;
  final String? activeRoleFilter;

  const AllUsersLoaded(this.users, this.total, {this.activeRoleFilter});

  @override
  List<Object?> get props => [users, total, activeRoleFilter];
}

class AnalyticsLoading extends AdminState {}

class AnalyticsLoaded extends AdminState {
  final Analytics analytics;

  const AnalyticsLoaded(this.analytics);

  @override
  List<Object?> get props => [analytics];
}

class AdminError extends AdminState {
  final String message;

  const AdminError(this.message);

  @override
  List<Object?> get props => [message];
}

class CompanyApproved extends AdminState {
  final String companyId;

  const CompanyApproved(this.companyId);

  @override
  List<Object?> get props => [companyId];
}

class UserRoleUpdated extends AdminState {
  final String userId;
  final String role;

  const UserRoleUpdated(this.userId, this.role);

  @override
  List<Object?> get props => [userId, role];
}

class CommissionUpdating extends AdminState {}

class CommissionUpdated extends AdminState {
  final double rate;

  const CommissionUpdated(this.rate);

  @override
  List<Object?> get props => [rate];
}

class SettingsLoaded extends AdminState {
  final Map<String, dynamic> settings;

  const SettingsLoaded(this.settings);

  @override
  List<Object?> get props => [settings];
}

class SettingsUpdated extends AdminState {}
