import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/driver/driver_cubit.dart';
import '../../cubit/driver/driver_state.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_input.dart';

/// Emergency report. Provides its own [DriverCubit] because the page is
/// pushed as a separate route, outside DriverHome's BlocProvider.
class EmergencyPage extends StatelessWidget {
  const EmergencyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<DriverCubit>(),
      child: const _EmergencyView(),
    );
  }
}

class _EmergencyView extends StatefulWidget {
  const _EmergencyView();

  @override
  State<_EmergencyView> createState() => _EmergencyViewState();
}

class _EmergencyViewState extends State<_EmergencyView> {
  String _selectedType = '';
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();

  final _emergencyTypes = [
    {'type': 'BREAKDOWN', 'icon': Icons.directions_bus_filled, 'label': 'Breakdown', 'color': AppColors.warning, 'desc': 'Vehicle mechanical failure'},
    {'type': 'ACCIDENT', 'icon': Icons.car_crash, 'label': 'Accident', 'color': AppColors.error, 'desc': 'Road accident or collision'},
    {'type': 'SEVERE_DELAY', 'icon': Icons.timer_off, 'label': 'Severe Delay', 'color': AppColors.info, 'desc': 'Significant unexpected delay'},
  ];

  @override
  void dispose() {
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Report Emergency')),
      body: BlocConsumer<DriverCubit, DriverState>(
        listener: (context, state) {
          if (state is EmergencyReported) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Emergency reported successfully'), backgroundColor: AppColors.success),
            );
            Navigator.pop(context);
          } else if (state is DriverError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Warning banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.errorLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.warning_amber, color: AppColors.error),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Emergency reports are sent to the operations center immediately.',
                          style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                const Text('Emergency Type', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),

                ..._emergencyTypes.map((type) {
                  final isSelected = _selectedType == type['type'];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Card(
                      color: isSelected ? (type['color'] as Color).withValues(alpha: 0.05) : null,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => setState(() => _selectedType = type['type'] as String),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: (type['color'] as Color).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(type['icon'] as IconData, color: type['color'] as Color, size: 24),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(type['label'] as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                                    Text(type['desc'] as String, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                Icon(Icons.check_circle, color: type['color'] as Color),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),

                const SizedBox(height: 20),

                AppInput(
                  label: 'Location (optional)',
                  controller: _locationController,
                  hint: 'e.g., Km 50 on Great North Road',
                  prefix: const Icon(Icons.location_on_outlined, size: 20),
                ),
                const SizedBox(height: 16),

                AppInput(
                  label: 'Description (optional)',
                  controller: _descriptionController,
                  hint: 'Additional details...',
                  maxLines: 3,
                ),
                const SizedBox(height: 24),

                AppButton(
                  label: 'Submit Emergency Report',
                  onPressed: _selectedType.isNotEmpty
                      ? () {
                          context.read<DriverCubit>().reportEmergency(
                            emergencyType: _selectedType,
                            description: _descriptionController.text.trim().isNotEmpty ? _descriptionController.text.trim() : null,
                            location: _locationController.text.trim().isNotEmpty ? _locationController.text.trim() : null,
                          );
                        }
                      : null,
                  variant: AppButtonVariant.danger,
                  isLoading: state is EmergencyReporting,
                  icon: Icons.send,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
