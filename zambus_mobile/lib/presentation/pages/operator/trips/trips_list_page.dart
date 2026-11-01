import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../injection_container.dart';
import '../../../cubit/operator/operator_cubit.dart';
import '../../../cubit/operator/operator_state.dart';
import '../../../widgets/common/loading_indicator.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../../core/utils/formatters.dart';
import '../../../cubit/auth/auth_cubit.dart';
import '../../../cubit/auth/auth_state.dart';

class TripsListPage extends StatelessWidget {
  const TripsListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<OperatorCubit>()..loadTrips(),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Trip Schedules')),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => Navigator.pushNamed(context, '/operator/trip-form'),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.add),
          label: const Text('Add Trip'),
        ),
        body: BlocBuilder<OperatorCubit, OperatorState>(
          builder: (context, state) {
            if (state is TripsLoading) {
              return const LoadingIndicator(message: 'Loading trips...');
            }
            if (state is TripsLoaded) {
              if (state.trips.isEmpty) {
                return const EmptyState(
                  icon: Icons.schedule,
                  title: 'No trips scheduled',
                  subtitle: 'Create your first trip schedule',
                );
              }
              return RefreshIndicator(
                onRefresh: () async => context.read<OperatorCubit>().loadTrips(),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: state.trips.length,
                  itemBuilder: (context, index) {
                    final trip = state.trips[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${trip.origin ?? "N/A"} - ${trip.destination ?? "N/A"}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _getStatusColor(trip.status).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    Formatters.formatTripStatus(trip.status),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: _getStatusColor(trip.status),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.schedule, size: 16, color: AppColors.textSecondary),
                                const SizedBox(width: 4),
                                Text(
                                  '${Formatters.formatDisplayDateTime(trip.departureTime)} - ${Formatters.formatDisplayTime(trip.estimatedArrival)}',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.attach_money, size: 16, color: AppColors.primary),
                                const SizedBox(width: 4),
                                Text(Formatters.formatCurrency(trip.fareAmount), style: const TextStyle(fontWeight: FontWeight.w600)),
                                const Spacer(),
                                // Trip actions
                                PopupMenuButton(
                                  itemBuilder: (context) => [
                                    if (trip.isScheduled) ...[
                                      const PopupMenuItem(value: 'open', child: Text('Open for Boarding')),
                                      const PopupMenuItem(value: 'cancel', child: Text('Cancel Trip')),
                                    ],
                                    if (trip.isBoarding) ...[
                                      const PopupMenuItem(value: 'close', child: Text('Close Trip')),
                                      const PopupMenuItem(value: 'cancel', child: Text('Cancel Trip')),
                                    ],
                                  ],
                                  onSelected: (action) {
                                    context.read<OperatorCubit>().updateTripStatus(trip.tripId, action as String);
                                  },
                                  child: const Icon(Icons.more_vert, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            }
            if (state is OperatorError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                      const SizedBox(height: 16),
                      Text(
                        state.message,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 14),
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => context.read<OperatorCubit>().loadTrips(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    return switch (status) {
      'SCHEDULED' => AppColors.info,
      'BOARDING' => AppColors.success,
      'IN_TRANSIT' => AppColors.warning,
      'COMPLETED' => AppColors.textSecondary,
      'CANCELLED' => AppColors.error,
      _ => AppColors.textSecondary,
    };
  }
}
