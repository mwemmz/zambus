import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/admin/admin_cubit.dart';
import '../../cubit/admin/admin_state.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_input.dart';
import '../../widgets/common/ui.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<AdminCubit>(),
      child: const _SettingsView(),
    );
  }
}

class _SettingsView extends StatefulWidget {
  const _SettingsView();

  @override
  State<_SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<_SettingsView> {
  final _commissionController = TextEditingController(text: '0.10');
  final _currencyController = TextEditingController(text: 'ZMW');
  final _seatLockController = TextEditingController(text: '10');

  @override
  void initState() {
    super.initState();
    // Load settings from DB
    context.read<AdminCubit>().loadSettings();
  }

  @override
  void dispose() {
    _commissionController.dispose();
    _currencyController.dispose();
    _seatLockController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AdminCubit, AdminState>(
      listener: (context, state) {
        if (state is CommissionUpdated) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Commission rate updated to ${(state.rate * 100).toStringAsFixed(1)}%'),
              backgroundColor: AppColors.success,
            ),
          );
        } else if (state is SettingsUpdated) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Settings saved'),
              backgroundColor: AppColors.success,
            ),
          );
        } else if (state is AdminError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('System Settings')),
        body: BlocBuilder<AdminCubit, AdminState>(
          builder: (context, state) {
            if (state is SettingsLoaded) {
              _commissionController.text =
                  (state.settings['commissionRate'] ?? 0.10).toString();
              _seatLockController.text = '${state.settings['seatLockDurationMinutes'] ?? 10}';
              _currencyController.text = state.settings['currency'] ?? 'ZMW';
            }
            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeader(
                    title: 'Commission',
                    subtitle: 'Platform earnings on each confirmed booking',
                  ),
                  _SettingsCard(
                    children: [
                      AppInput(
                        label: 'Commission Rate (decimal)',
                        controller: _commissionController,
                        hint: '0.10 = 10%',
                        keyboardType:
                            const TextInputType.numberWithOptions(decimal: true),
                      ),
                      const SizedBox(height: 16),
                      BlocBuilder<AdminCubit, AdminState>(
                        builder: (context, state) {
                          return AppButton(
                            label: 'Update Commission Rate',
                            onPressed: () {
                              final rate = double.tryParse(_commissionController.text);
                              if (rate == null || rate < 0 || rate > 1) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                        'Enter a rate between 0 and 1 (e.g. 0.10 for 10%)'),
                                    backgroundColor: AppColors.error,
                                  ),
                                );
                                return;
                              }
                              context.read<AdminCubit>().updateCommission(rate);
                            },
                            isLoading: state is CommissionUpdating,
                            icon: Icons.save_outlined,
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  SectionHeader(
                    title: 'Booking',
                    subtitle: 'Seat holds and currency',
                  ),
                  _SettingsCard(
                    children: [
                      AppInput(
                        label: 'Seat Lock Duration (minutes)',
                        controller: _seatLockController,
                        hint: '10',
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      AppInput(
                        label: 'Currency',
                        controller: _currencyController,
                        hint: 'ZMW',
                      ),
                      const SizedBox(height: 16),
                      AppButton(
                        label: 'Save Settings',
                        onPressed: () {
                          final lockDuration = int.tryParse(_seatLockController.text);
                          context.read<AdminCubit>().updateSettings({
                            'seatLockDurationMinutes': lockDuration ?? 10,
                            'currency': _currencyController.text.trim(),
                          });
                        },
                        icon: Icons.check_circle_outline,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  SectionHeader(title: 'About'),
                  _SettingsCard(
                    children: const [
                      InfoRow(label: 'Version', value: '1.0.0'),
                      InfoRow(label: 'Phase', value: 'Phase 1 - Prototype'),
                      InfoRow(label: 'Backend', value: 'Node.js + Express + PostgreSQL'),
                      InfoRow(label: 'Mobile', value: 'Flutter'),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;
  const _SettingsCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}
