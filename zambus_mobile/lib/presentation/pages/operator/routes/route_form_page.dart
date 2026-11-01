import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../injection_container.dart';
import '../../../cubit/operator/operator_cubit.dart';
import '../../../cubit/operator/operator_state.dart';
import '../../../widgets/common/app_button.dart';
import '../../../widgets/common/app_input.dart';
import '../../../widgets/common/ui.dart';

class RouteFormPage extends StatefulWidget {
  const RouteFormPage({super.key});

  @override
  State<RouteFormPage> createState() => _RouteFormPageState();
}

class _RouteFormPageState extends State<RouteFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _originController = TextEditingController();
  final _destinationController = TextEditingController();
  final _timeController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _originController.dispose();
    _destinationController.dispose();
    _timeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<OperatorCubit>(),
      child: BlocListener<OperatorCubit, OperatorState>(
        listener: (context, state) {
        if (state is RouteCreated) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Route submitted — awaiting admin approval'),
              backgroundColor: AppColors.success,
            ),
          );
          Navigator.pop(context);
        } else if (state is OperatorError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }        },
        child: Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: const Text('Create Route')),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: AppColors.infoLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.info.withValues(alpha: 0.25)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, size: 18, color: AppColors.info),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'New routes are reviewed by the ZamBus admin team before trips can be scheduled on them.',
                            style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SectionHeader(title: 'Route Details'),
                  AppInput(
                    label: 'Route Name',
                    controller: _nameController,
                    hint: 'e.g., Lusaka - Livingstone',
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),

                  AppInput(
                    label: 'Origin',
                    controller: _originController,
                    hint: 'e.g., Lusaka',
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),

                  AppInput(
                    label: 'Destination',
                    controller: _destinationController,
                    hint: 'e.g., Livingstone',
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),

                  AppInput(
                    label: 'Estimated Travel Time (minutes)',
                    controller: _timeController,
                    hint: 'e.g., 180',
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 32),

                  BlocBuilder<OperatorCubit, OperatorState>(
                    builder: (context, state) {
                      return AppButton(
                        label: 'Create Route',
                        onPressed: () {
                          if (_formKey.currentState?.validate() ?? false) {
                            context.read<OperatorCubit>().createRoute(
                              routeName: _nameController.text.trim(),
                              origin: _originController.text.trim(),
                              destination: _destinationController.text.trim(),
                              estimatedTravelTime: _timeController.text.isNotEmpty ? int.parse(_timeController.text) : null,
                            );
                          }
                        },
                        icon: Icons.add_circle_outline,
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
