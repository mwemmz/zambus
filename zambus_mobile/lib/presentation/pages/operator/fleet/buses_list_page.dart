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
import '../../../../core/utils/formatters.dart';
import '../../../../data/models/bus_model.dart';

class BusesListPage extends StatelessWidget {
  const BusesListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<OperatorCubit>()..loadBuses(),
      child: const _BusesListView(),
    );
  }
}

class _BusesListView extends StatelessWidget {
  const _BusesListView();

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
          appBar: AppBar(title: const Text('Fleet')),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => Navigator.pushNamed(context, '/operator/bus-form'),
            icon: const Icon(Icons.add),
            label: const Text('Add Bus'),
          ),
          body: Builder(
            builder: (context) {
              if (state is BusesLoading) {
                return const LoadingIndicator(message: 'Loading buses...');
              }
              if (state is BusesLoaded) {
                if (state.buses.isEmpty) {
                  return EmptyState(
                    icon: Icons.directions_bus,
                    title: 'No buses registered',
                    subtitle: 'Add your first bus to start scheduling trips',
                    action: AppButton(
                      label: 'Add Bus',
                      onPressed: () => Navigator.pushNamed(context, '/operator/bus-form'),
                      isExpanded: false,
                      icon: Icons.add,
                    ),
                  );
                }
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async => context.read<OperatorCubit>().loadBuses(),
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                    itemCount: state.buses.length,
                    itemBuilder: (context, index) {
                      final bus = state.buses[index];
                      return _BusCard(bus: bus);
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

class _BusCard extends StatelessWidget {
  final Bus bus;
  const _BusCard({required this.bus});

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
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                StatusBadge(label: bus.approvalStatus),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _BusMeta(icon: Icons.event_seat, text: '${bus.seatCapacity} seats'),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _BusMeta(
                    icon: Icons.build_circle_outlined,
                    text: Formatters.formatMaintenanceStatus(bus.maintenanceStatus),
                  ),
                ),
              ],
            ),
            if (bus.amenities.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: bus.amenities
                    .take(4)
                    .map((a) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            a,
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                        ))
                    .toList(),
              ),
            ],
            if (bus.isPending) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(Icons.hourglass_top, size: 14, color: AppColors.warning),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Awaiting admin approval before it can be scheduled',
                      style: TextStyle(fontSize: 12, color: AppColors.warning),
                    ),
                  ),
                ],
              ),
            ],
            if (bus.isRejected && bus.rejectionReason != null) ...[
              const SizedBox(height: 10),
              Text(
                'Rejected: ${bus.rejectionReason}',
                style: const TextStyle(fontSize: 12, color: AppColors.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BusMeta extends StatelessWidget {
  final IconData icon;
  final String text;
  const _BusMeta({required this.icon, required this.text});

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
