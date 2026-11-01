import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../injection_container.dart';
import '../../../cubit/operator/operator_cubit.dart';
import '../../../cubit/operator/operator_state.dart';
import '../../../widgets/common/loading_indicator.dart';
import '../../../widgets/common/error_display.dart';
import '../../../widgets/common/ui.dart';
import '../../../../core/utils/formatters.dart';

class RevenueDashboardPage extends StatelessWidget {
  const RevenueDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<OperatorCubit>()..loadAnalytics(),
      child: const _RevenueView(),
    );
  }
}

class _RevenueView extends StatelessWidget {
  const _RevenueView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Revenue Dashboard')),
      body: BlocBuilder<OperatorCubit, OperatorState>(
        builder: (context, state) {
          if (state is AnalyticsLoading) {
            return const LoadingIndicator(message: 'Loading analytics...');
          }
          if (state is AnalyticsLoaded) {
            final a = state.analytics;
            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () async => context.read<OperatorCubit>().loadAnalytics(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Revenue summary banner
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [AppColors.primary, Color(0xFF123B96)],
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Total Revenue',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            Formatters.formatCurrency(a.totalRevenue),
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                              letterSpacing: -0.8,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: _BannerMetric(
                                  label: 'Commission',
                                  value: Formatters.formatCurrency(a.commissionAmount),
                                ),
                              ),
                              Container(
                                width: 1,
                                height: 32,
                                color: Colors.white.withValues(alpha: 0.2),
                              ),
                              Expanded(
                                child: _BannerMetric(
                                  label: 'Net Payout',
                                  value: Formatters.formatCurrency(a.netPayout),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    const SectionHeader(title: 'Company Metrics'),
                    Row(
                      children: [
                        Expanded(
                          child: StatCard(
                            label: 'Active Trips',
                            value: '${a.totalActiveTrips}',
                            icon: Icons.directions_bus_outlined,
                            color: AppColors.driverColor,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: StatCard(
                            label: 'Confirmed Bookings',
                            value: '${a.totalBookings}',
                            icon: Icons.confirmation_num_outlined,
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: StatCard(
                            label: 'Buses',
                            value: '${a.totalBuses}',
                            icon: Icons.airline_seat_recline_normal_outlined,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: StatCard(
                            label: 'Routes',
                            value: '${a.totalRoutes}',
                            icon: Icons.route_outlined,
                            color: AppColors.secondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }
          if (state is OperatorError) {
            return ErrorDisplay(
              message: state.message,
              onRetry: () => context.read<OperatorCubit>().loadAnalytics(),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

class _BannerMetric extends StatelessWidget {
  final String label;
  final String value;
  const _BannerMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.white.withValues(alpha: 0.7),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ],
    );
  }
}
