import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../injection_container.dart';
import '../../../cubit/operator/operator_cubit.dart';
import '../../../cubit/operator/operator_state.dart';
import '../../../widgets/common/app_button.dart';
import '../../../widgets/common/app_input.dart';
import '../../../widgets/common/ui.dart';

class BusFormPage extends StatefulWidget {
  const BusFormPage({super.key});

  @override
  State<BusFormPage> createState() => _BusFormPageState();
}

class _BusFormPageState extends State<BusFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _regController = TextEditingController();
  final _modelController = TextEditingController();
  final _capacityController = TextEditingController();
  final _amenities = ['AC', 'WiFi', 'Toilet', 'TV', 'Charging'];
  final Set<String> _selectedAmenities = {};

  @override
  void dispose() {
    _regController.dispose();
    _modelController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<OperatorCubit>(),
      child: BlocListener<OperatorCubit, OperatorState>(
        listener: (context, state) {
        if (state is BusCreated) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Bus submitted — awaiting admin approval'),
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
          appBar: AppBar(title: const Text('Register New Bus')),
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
                            'New buses are reviewed by the ZamBus admin team before they can be scheduled for trips.',
                            style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SectionHeader(title: 'Bus Details'),
                  AppInput(
                    label: 'Registration Number',
                    controller: _regController,
                    hint: 'e.g., BCA-123',
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),

                  AppInput(
                    label: 'Model',
                    controller: _modelController,
                    hint: 'e.g., Toyota Coaster',
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),

                  AppInput(
                    label: 'Seat Capacity',
                    controller: _capacityController,
                    hint: 'e.g., 40',
                    keyboardType: TextInputType.number,
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Required';
                      if (int.tryParse(v) == null || int.parse(v) <= 0) return 'Must be a positive number';
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  const Text('Amenities', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _amenities.map((a) {
                      final selected = _selectedAmenities.contains(a);
                      return FilterChip(
                        label: Text(a),
                        selected: selected,
                        onSelected: (v) {
                          setState(() {
                            if (v) {
                              _selectedAmenities.add(a);
                            } else {
                              _selectedAmenities.remove(a);
                            }
                          });
                        },
                        selectedColor: AppColors.primary.withValues(alpha: 0.1),
                        checkmarkColor: AppColors.primary,
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 32),

                  BlocBuilder<OperatorCubit, OperatorState>(
                    builder: (context, state) {
                      return AppButton(
                        label: 'Register Bus',
                        onPressed: () {
                          if (_formKey.currentState?.validate() ?? false) {
                            context.read<OperatorCubit>().createBus(
                              registrationNumber: _regController.text.trim(),
                              model: _modelController.text.trim(),
                              seatCapacity: int.parse(_capacityController.text),
                              amenities: _selectedAmenities.toList(),
                            );
                          }
                        },
                        isLoading: state is BusCreated,
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
