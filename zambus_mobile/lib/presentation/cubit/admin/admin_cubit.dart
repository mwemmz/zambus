import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/utils/error_messages.dart';
import '../../../data/datasources/api_datasource.dart';
import 'admin_state.dart';

class AdminCubit extends Cubit<AdminState> {
  final ApiDatasource _datasource;
  AdminCubit(this._datasource) : super(AdminInitial());

  Future<void> loadPendingCompanies() async {
    try {
      emit(PendingCompaniesLoading());
      final companies = await _datasource.getPendingCompanies();
      emit(PendingCompaniesLoaded(companies));
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  /// Loads the full approvals queue: pending companies + pending buses +
  /// pending routes in one shot.
  Future<void> loadReviewQueue() async {
    try {
      emit(PendingCompaniesLoading());
      final companiesFuture = _datasource.getPendingCompanies();
      final busesFuture = _datasource.getAdminBuses(status: 'PENDING');
      final routesFuture = _datasource.getAdminRoutes(status: 'PENDING');
      final companies = await companiesFuture;
      final buses = await busesFuture;
      final routes = await routesFuture;
      emit(ReviewQueueLoaded(
        companies: companies,
        pendingBuses: buses,
        pendingRoutes: routes,
      ));
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadBusesForReview({String? status}) async {
    try {
      emit(BusesReviewLoading());
      final buses = await _datasource.getAdminBuses(status: status);
      emit(BusesReviewLoaded(buses));
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadRoutesForReview({String? status}) async {
    try {
      emit(RoutesReviewLoading());
      final routes = await _datasource.getAdminRoutes(status: status);
      emit(RoutesReviewLoaded(routes));
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> approveBus(String id) async {
    try {
      await _datasource.approveBus(id);
      emit(BusApproved(id));
      await refreshAfterReview();
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> rejectBus(String id, {String? reason}) async {
    try {
      await _datasource.rejectBus(id, reason: reason);
      emit(BusRejected(id));
      await refreshAfterReview();
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> approveRoute(String id) async {
    try {
      await _datasource.approveRoute(id);
      emit(RouteApproved(id));
      await refreshAfterReview();
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> rejectRoute(String id, {String? reason}) async {
    try {
      await _datasource.rejectRoute(id, reason: reason);
      emit(RouteRejected(id));
      await refreshAfterReview();
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  /// After a decision, re-fetch whichever collection matches the current
  /// loaded state so the list updates in place.
  Future<void> refreshAfterReview() async {
    final s = state;
    if (s is ReviewQueueLoaded) {
      await loadReviewQueue();
    } else if (s is BusesReviewLoaded) {
      await loadBusesForReview();
    } else if (s is RoutesReviewLoaded) {
      await loadRoutesForReview();
    } else if (s is PendingCompaniesLoaded) {
      await loadPendingCompanies();
    }
  }

  Future<void> approveCompany(String id) async {
    try {
      await _datasource.approveCompany(id);
      emit(CompanyApproved(id));
      await loadPendingCompanies();
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> rejectCompany(String id) async {
    try {
      await _datasource.rejectCompany(id);
      await loadPendingCompanies();
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadAllUsers({String? role, int page = 1, int limit = 50}) async {
    try {
      emit(AllUsersLoading());
      final users = await _datasource.getAllUsers(role: role, page: page, limit: limit);
      emit(AllUsersLoaded(users, users.length, activeRoleFilter: role));
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> updateUserRole(String id, String role) async {
    try {
      await _datasource.updateUserRole(id, role);
      emit(UserRoleUpdated(id, role));
      await loadAllUsers();
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadAnalytics() async {
    try {
      emit(AnalyticsLoading());
      final analytics = await _datasource.getAnalytics();
      emit(AnalyticsLoaded(analytics));
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> updateCommission(double rate) async {
    try {
      emit(CommissionUpdating());
      await _datasource.updateCommission(rate);
      emit(CommissionUpdated(rate));
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> loadSettings() async {
    try {
      final settings = await _datasource.getSettings();
      emit(SettingsLoaded(settings));
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }

  Future<void> updateSettings(Map<String, dynamic> updates) async {
    try {
      await _datasource.updateSettings(updates);
      emit(SettingsUpdated());
      await loadSettings();
    } catch (e) {
      emit(AdminError(ErrorMessages.from(e)));
    }
  }
}
