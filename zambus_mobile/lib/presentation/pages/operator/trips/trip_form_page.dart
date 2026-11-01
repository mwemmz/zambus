import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../injection_container.dart';
import '../../../cubit/operator/operator_cubit.dart';
import '../../../cubit/operator/operator_state.dart';
import '../../../widgets/common/app_button.dart';
import '../../../../data/models/models.dart' as models;

class TripFormPage extends StatelessWidget {
  const TripFormPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<OperatorCubit>()..loadAll(),
      child: const _TripFormView(),
    );
  }
}

class _TripFormView extends StatefulWidget {
  const _TripFormView();

  @override
  State<_TripFormView> createState() => _TripFormViewState();
}

class _TripFormViewState extends State<_TripFormView> {
  final _formKey = GlobalKey<FormState>();
  final _fareController = TextEditingController();

  models.Route? _selectedRoute;
  models.Bus? _selectedBus;
  models.User? _selectedDriver;
  DateTime _departureTime = DateTime.now().add(const Duration(hours: 1));
  DateTime _arrivalTime = DateTime.now().add(const Duration(hours: 5));

  @override
  void dispose() {
    _fareController.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime({required bool isDeparture}) async {
    final date = await showDatePicker(
      context: context,
      initialDate: isDeparture ? _departureTime : _arrivalTime,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null && mounted) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(isDeparture ? _departureTime : _arrivalTime),
      );
      if (time != null && mounted) {
        final dateTime = DateTime(date.year, date.month, date.day, time.hour, time.minute);
        setState(() {
          if (isDeparture) {
            _departureTime = dateTime;
            if (_arrivalTime.isBefore(_departureTime)) {
              _arrivalTime = _departureTime.add(const Duration(hours: 4));
            }
          } else {
            _arrivalTime = dateTime;
          }
        });
      }
    }
  }

  void _submit() {
    if (_selectedRoute == null || _selectedBus == null || _selectedDriver == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Select a route, bus, and driver'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    final fare = double.tryParse(_fareController.text);
    if (fare == null || fare <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid fare amount'), backgroundColor: AppColors.error),
      );
      return;
    }
    context.read<OperatorCubit>().createTrip(
      routeId: _selectedRoute!.routeId,
      busId: _selectedBus!.busId,
      driverId: _selectedDriver!.userId,
      departureTime: _departureTime,
      estimatedArrival: _arrivalTime,
      fareAmount: fare,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OperatorCubit, OperatorState>(
      listener: (context, state) {
        if (state is TripCreated) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Trip created successfully'), backgroundColor: AppColors.success),
          );
          Navigator.pop(context);
        } else if (state is OperatorError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      builder: (context, state) {
        // Merge data from OperatorDataLoaded or fall back to individual loads
        List<models.Route> routes = [];
        List<models.Bus> buses = [];
        List<models.User> drivers = [];
        if (state is OperatorDataLoaded) {
          // Only admin-approved buses and routes can be scheduled.
          routes = state.routes.where((r) => r.isApproved).toList();
          buses = state.buses.where((b) => b.isApproved && b.isOperational).toList();
          drivers = state.drivers;
        }

        final hasApprovedResources = routes.isNotEmpty && buses.isNotEmpty;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: const Text('Create Trip')),
          body: !hasApprovedResources
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: const BoxDecoration(
                            color: AppColors.surfaceVariant,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.approval_outlined, size: 44, color: AppColors.textHint),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'No approved buses or routes',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Trips can only be scheduled with admin-approved buses and routes. Add them in Fleet and Routes, then wait for approval.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                        ),
                        const SizedBox(height: 20),
                        AppButton(
                          label: 'Reload',
                          onPressed: () => context.read<OperatorCubit>().loadAll(),
                          variant: AppButtonVariant.outline,
                          isExpanded: false,
                        ),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Route', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<models.Route>(
                          value: _selectedRoute,
                          isExpanded: true,
                          decoration: _dropdownDecoration('Select route'),
                          items: routes.map((r) {
                            return DropdownMenuItem(
                              value: r,
                              child: Text('${r.routeName} (${r.displayName})', overflow: TextOverflow.ellipsis),
                            );
                          }).toList(),
                          onChanged: (v) => setState(() => _selectedRoute = v),
                        ),
                        const SizedBox(height: 16),

                        const Text('Bus', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<models.Bus>(
                          value: _selectedBus,
                          isExpanded: true,
                          decoration: _dropdownDecoration('Select bus'),
                          items: buses.map((b) {
                            return DropdownMenuItem(
                              value: b,
                              child: Text('${b.registrationNumber} - ${b.model} (${b.seatCapacity} seats)', overflow: TextOverflow.ellipsis),
                            );
                          }).toList(),
                          onChanged: (v) => setState(() => _selectedBus = v),
                        ),
                        const SizedBox(height: 16),

                        const Text('Driver', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<models.User>(
                          value: _selectedDriver,
                          isExpanded: true,
                          decoration: _dropdownDecoration('Select driver'),
                          items: drivers.map((d) {
                            return DropdownMenuItem(
                              value: d,
                              child: Text('${d.fullName} (${d.phoneNumber})', overflow: TextOverflow.ellipsis),
                            );
                          }).toList(),
                          onChanged: (v) => setState(() => _selectedDriver = v),
                        ),
                        const SizedBox(height: 20),

                        const Text('Departure Time', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 6),
                        Card(
                          child: ListTile(
                            leading: const Icon(Icons.departure_board, color: AppColors.primary),
                            title: Text(_formatDateTime(_departureTime)),
                            trailing: const Icon(Icons.edit_calendar),
                            onTap: () => _pickDateTime(isDeparture: true),
                          ),
                        ),
                        const SizedBox(height: 16),

                        const Text('Estimated Arrival', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                        const SizedBox(height: 6),
                        Card(
                          child: ListTile(
                            leading: const Icon(Icons.access_time, color: AppColors.primary),
                            title: Text(_formatDateTime(_arrivalTime)),
                            trailing: const Icon(Icons.edit_calendar),
                            onTap: () => _pickDateTime(isDeparture: false),
                          ),
                        ),
                        const SizedBox(height: 16),

                        TextFormField(
                          controller: _fareController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(fontSize: 15, color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            labelText: 'Fare Amount (K)',
                            hintText: 'e.g., 150.00',
                            filled: true,
                            fillColor: AppColors.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),

                        AppButton(
                          label: 'Create Trip',
                          onPressed: _submit,
                          icon: Icons.add_circle_outline,
                        ),
                      ],
                    ),
                  ),
                ),
        );
      },
    );
  }

  InputDecoration _dropdownDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
    );
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}
