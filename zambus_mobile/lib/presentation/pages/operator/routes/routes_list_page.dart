import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../injection_container.dart';
import '../../../cubit/operator/operator_cubit.dart';
import '../../../cubit/operator/operator_state.dart';
import '../../../widgets/common/loading_indicator.dart';
import '../../../widgets/common/empty_state.dart';
import '../../../widgets/common/app_button.dart';
import '../../../widgets/common/ui.dart';
import '../../../../data/models/route_model.dart' as models;

class RoutesListPage extends StatelessWidget {
  const RoutesListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<OperatorCubit>()..loadRoutes(),
      child: const _RoutesListView(),
    );
  }
}

class _RoutesListView extends StatelessWidget {
  const _RoutesListView();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OperatorCubit, OperatorState>(
      listener: (context, state) {
        if (state is OperatorError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: const Text('Routes')),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => Navigator.pushNamed(context, '/operator/route-form'),
            icon: const Icon(Icons.add),
            label: const Text('Add Route'),
          ),
          body: Builder(
            builder: (context) {
              if (state is RoutesLoading) {
                return const LoadingIndicator(message: 'Loading routes...');
              }
              if (state is RoutesLoaded) {
                if (state.routes.isEmpty) {
                  return EmptyState(
                    icon: Icons.route,
                    title: 'No routes created',
                    subtitle: 'Create your first route to start scheduling trips',
                    action: AppButton(
                      label: 'Add Route',
                      onPressed: () => Navigator.pushNamed(context, '/operator/route-form'),
                      isExpanded: false,
                      icon: Icons.add,
                    ),
                  );
                }
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async => context.read<OperatorCubit>().loadRoutes(),
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                    itemCount: state.routes.length,
                    itemBuilder: (context, index) {
                      final route = state.routes[index];
                      return _RouteCard(route: route);
                    },
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        );
      },
    );
  }
}

class _RouteCard extends StatelessWidget {
  final models.Route route;
  const _RouteCard({required this.route});

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
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                StatusBadge(label: route.approvalStatus),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                if (route.intermediateStops.isNotEmpty)
                  Expanded(
                    child: _RouteMeta(
                      icon: Icons.more_horiz,
                      text: '${route.intermediateStops.length} stops',
                    ),
                  ),
                if (route.estimatedTravelTime != null)
                  Expanded(
                    child: _RouteMeta(
                      icon: Icons.schedule,
                      text:
                          '${route.estimatedTravelTime! ~/ 60}h ${route.estimatedTravelTime! % 60}m',
                    ),
                  ),
              ],
            ),
            if (route.isPending) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.hourglass_top, size: 14, color: AppColors.warning),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Awaiting admin approval before trips can be scheduled',
                      style: TextStyle(fontSize: 12, color: AppColors.warning),
                    ),
                  ),
                ],
              ),
            ],
            if (route.isRejected && route.rejectionReason != null) ...[
              const SizedBox(height: 10),
              Text(
                'Rejected: ${route.rejectionReason}',
                style: const TextStyle(fontSize: 12, color: AppColors.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RouteMeta extends StatelessWidget {
  final IconData icon;
  final String text;
  const _RouteMeta({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 15, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            text,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
