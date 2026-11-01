import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/bus_model.dart';
import '../../../data/models/route_model.dart' as models;
import '../../../injection_container.dart';
import '../../cubit/admin/admin_cubit.dart';
import '../../cubit/admin/admin_state.dart';
import '../../widgets/common/loading_indicator.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/ui.dart';

/// Admin review hub: approve or reject company registrations, new buses,
/// and new routes submitted by operators.
class ApprovalsPage extends StatelessWidget {
  const ApprovalsPage({super.key, this.initialTabIndex = 0});

  final int initialTabIndex;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<AdminCubit>()..loadReviewQueue(),
      child: DefaultTabController(
        length: 3,
        initialIndex: initialTabIndex,
        child: const _ApprovalsView(),
      ),
    );
  }
}

class _ApprovalsView extends StatelessWidget {
  const _ApprovalsView();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AdminCubit, AdminState>(
      listener: (context, state) {
        final message = switch (state) {
          CompanyApproved() => 'Company approved',
          BusApproved() => 'Bus approved',
          RouteApproved() => 'Route approved',
          BusRejected() => 'Bus rejected',
          RouteRejected() => 'Route rejected',
          AdminError() => state.message,
          _ => null,
        };
        if (message != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(message),
              backgroundColor:
                  state is AdminError ? AppColors.error : AppColors.success,
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: const Text('Approvals'),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => context.read<AdminCubit>().loadReviewQueue(),
              ),
            ],
          ),
          body: Column(
            children: [
              Container(
                color: AppColors.surface,
                child: TabBar(
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelStyle: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  dividerColor: AppColors.border,
                  tabs: const [
                    Tab(text: 'Companies'),
                    Tab(text: 'Buses'),
                    Tab(text: 'Routes'),
                  ],
                ),
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _CompaniesTab(state: state),
                    _BusesTab(state: state),
                    _RoutesTab(state: state),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Companies tab
// ---------------------------------------------------------------------------

class _CompaniesTab extends StatelessWidget {
  final AdminState state;
  const _CompaniesTab({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state is PendingCompaniesLoading) {
      return const LoadingIndicator(message: 'Loading companies...');
    }
    if (state is AdminError) {
      return _ReviewError(message: (state as AdminError).message);
    }
    final companies = switch (state) {
      ReviewQueueLoaded s => s.companies,
      PendingCompaniesLoaded s => s.companies,
      _ => <dynamic>[],
    };
    if (companies.isEmpty) {
      return const EmptyState(
        icon: Icons.verified_outlined,
        title: 'No pending companies',
        subtitle: 'All company registrations have been reviewed',
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async => context.read<AdminCubit>().loadReviewQueue(),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: companies.length,
        itemBuilder: (context, index) {
          final company = companies[index] as Map<String, dynamic>;
          final operator = company['operator'] as Map<String, dynamic>?;
          return _CompanyReviewCard(
            companyName: company['companyName'] ?? 'Unknown Company',
            registrationNumber: company['registrationNumber'] as String?,
            contactEmail: company['contactEmail'] as String?,
            contactPhone: company['contactPhone'] as String?,
            operatorName: operator?['fullName'] as String?,
            operatorEmail: operator?['email'] as String?,
            onApprove: () => context
                .read<AdminCubit>()
                .approveCompany(company['companyId'] as String),
            onReject: () => _confirmReject(
              context,
              title: 'Reject company?',
              subtitle:
                  '${company['companyName'] ?? 'This company'} will be removed from the platform.',
              onConfirm: (reason) => context
                  .read<AdminCubit>()
                  .rejectCompany(company['companyId'] as String),
            ),
          );
        },
      ),
    );
  }
}

class _CompanyReviewCard extends StatelessWidget {
  final String companyName;
  final String? registrationNumber;
  final String? contactEmail;
  final String? contactPhone;
  final String? operatorName;
  final String? operatorEmail;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _CompanyReviewCard({
    required this.companyName,
    this.registrationNumber,
    this.contactEmail,
    this.contactPhone,
    this.operatorName,
    this.operatorEmail,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.warningLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.business, color: AppColors.warning, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        companyName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (operatorName != null)
                        Text(
                          'Operator: $operatorName',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                const StatusBadge(label: 'PENDING'),
              ],
            ),
            const SizedBox(height: 12),
            if (registrationNumber != null)
              InfoRow(icon: Icons.badge_outlined, label: 'Reg. No.', value: registrationNumber!),
            if (contactEmail != null)
              InfoRow(icon: Icons.email_outlined, label: 'Email', value: contactEmail!),
            if (contactPhone != null)
              InfoRow(icon: Icons.phone_outlined, label: 'Phone', value: contactPhone!),
            if (operatorEmail != null)
              InfoRow(icon: Icons.alternate_email, label: 'Account', value: operatorEmail!),
            const SizedBox(height: 14),
            _DecisionRow(onApprove: onApprove, onReject: onReject),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Buses tab
// ---------------------------------------------------------------------------

class _BusesTab extends StatelessWidget {
  final AdminState state;
  const _BusesTab({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state is BusesReviewLoading) {
      return const LoadingIndicator(message: 'Loading buses...');
    }
    if (state is AdminError) {
      return _ReviewError(message: (state as AdminError).message);
    }
    final buses = switch (state) {
      ReviewQueueLoaded s => s.pendingBuses,
      BusesReviewLoaded s => s.buses,
      _ => <Bus>[],
    };
    if (buses.isEmpty) {
      return const EmptyState(
        icon: Icons.directions_bus,
        title: 'No pending buses',
        subtitle: 'New bus registrations will appear here',
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async => context.read<AdminCubit>().loadReviewQueue(),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: buses.length,
        itemBuilder: (context, index) {
          final bus = buses[index];
          return _BusReviewCard(
            bus: bus,
            onApprove: () => context.read<AdminCubit>().approveBus(bus.busId),
            onReject: () => _confirmReject(
              context,
              title: 'Reject bus?',
              subtitle: '${bus.registrationNumber} will be marked as rejected and the operator will be notified to update it.',
              onConfirm: (reason) =>
                  context.read<AdminCubit>().rejectBus(bus.busId, reason: reason),
            ),
          );
        },
      ),
    );
  }
}

class _BusReviewCard extends StatelessWidget {
  final Bus bus;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _BusReviewCard({
    required this.bus,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.directions_bus, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        bus.registrationNumber,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        bus.model,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                StatusBadge(label: bus.approvalStatus),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.event_seat, size: 15, color: AppColors.textSecondary),
                const SizedBox(width: 6),
                Text(
                  '${bus.seatCapacity} seats',
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
                const SizedBox(width: 16),
                if (bus.amenities.isNotEmpty)
                  Expanded(
                    child: Text(
                      bus.amenities.join(', '),
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),
            if (bus.isRejected && bus.rejectionReason != null) ...[
              const SizedBox(height: 8),
              Text(
                'Reason: ${bus.rejectionReason}',
                style: const TextStyle(fontSize: 12, color: AppColors.error),
              ),
            ],
            const SizedBox(height: 14),
            _DecisionRow(onApprove: onApprove, onReject: onReject),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Routes tab
// ---------------------------------------------------------------------------

class _RoutesTab extends StatelessWidget {
  final AdminState state;
  const _RoutesTab({required this.state});

  @override
  Widget build(BuildContext context) {
    if (state is RoutesReviewLoading) {
      return const LoadingIndicator(message: 'Loading routes...');
    }
    if (state is AdminError) {
      return _ReviewError(message: (state as AdminError).message);
    }
    final routes = switch (state) {
      ReviewQueueLoaded s => s.pendingRoutes,
      RoutesReviewLoaded s => s.routes,
      _ => <models.Route>[],
    };
    if (routes.isEmpty) {
      return const EmptyState(
        icon: Icons.route,
        title: 'No pending routes',
        subtitle: 'New route submissions will appear here',
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async => context.read<AdminCubit>().loadReviewQueue(),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: routes.length,
        itemBuilder: (context, index) {
          final route = routes[index];
          return _RouteReviewCard(
            route: route,
            onApprove: () => context.read<AdminCubit>().approveRoute(route.routeId),
            onReject: () => _confirmReject(
              context,
              title: 'Reject route?',
              subtitle: '${route.routeName} will be marked as rejected and the operator will be notified to update it.',
              onConfirm: (reason) =>
                  context.read<AdminCubit>().rejectRoute(route.routeId, reason: reason),
            ),
          );
        },
      ),
    );
  }
}

class _RouteReviewCard extends StatelessWidget {
  final models.Route route;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _RouteReviewCard({
    required this.route,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.route, color: AppColors.secondary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        route.routeName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        route.displayName,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                StatusBadge(label: route.approvalStatus),
              ],
            ),
            const SizedBox(height: 12),
            if (route.intermediateStops.isNotEmpty)
              InfoRow(
                icon: Icons.more_horiz,
                label: 'Stops',
                value: route.intermediateStops.join(', '),
              ),
            if (route.estimatedTravelTime != null)
              InfoRow(
                icon: Icons.schedule,
                label: 'Travel time',
                value:
                    '${route.estimatedTravelTime! ~/ 60}h ${route.estimatedTravelTime! % 60}m',
              ),
            if (route.isRejected && route.rejectionReason != null) ...[
              const SizedBox(height: 8),
              Text(
                'Reason: ${route.rejectionReason}',
                style: const TextStyle(fontSize: 12, color: AppColors.error),
              ),
            ],
            const SizedBox(height: 14),
            _DecisionRow(onApprove: onApprove, onReject: onReject),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

class _DecisionRow extends StatelessWidget {
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _DecisionRow({required this.onApprove, required this.onReject});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onReject,
            icon: const Icon(Icons.close, size: 18),
            label: const Text('Reject'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error,
              side: BorderSide(color: AppColors.error.withValues(alpha: 0.4)),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: onApprove,
            icon: const Icon(Icons.check, size: 18),
            label: const Text('Approve'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
              elevation: 0,
            ),
          ),
        ),
      ],
    );
  }
}

class _ReviewError extends StatelessWidget {
  final String message;
  const _ReviewError({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => context.read<AdminCubit>().loadReviewQueue(),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Rejection confirmation dialog with an optional reason field.
Future<void> _confirmReject(
  BuildContext context, {
  required String title,
  required String subtitle,
  required Future<void> Function(String? reason) onConfirm,
}) async {
  final reasonController = TextEditingController();
  await showDialog(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(subtitle),
          const SizedBox(height: 16),
          TextField(
            controller: reasonController,
            maxLines: 2,
            maxLength: 255,
            decoration: const InputDecoration(
              hintText: 'Reason (optional)',
              counterText: '',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.error),
          onPressed: () async {
            Navigator.pop(dialogContext);
            await onConfirm(
              reasonController.text.trim().isNotEmpty
                  ? reasonController.text.trim()
                  : null,
            );
          },
          child: const Text('Reject'),
        ),
      ],
    ),
  );
}
