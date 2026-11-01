import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/passenger/passenger_cubit.dart';
import '../../cubit/passenger/passenger_state.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/error_display.dart';
import '../../widgets/common/loading_indicator.dart';
import '../../widgets/seats/bus_layout.dart';
import '../../../core/utils/formatters.dart';

class SeatSelectionPage extends StatelessWidget {
  final String tripId;
  final int busCapacity;

  const SeatSelectionPage({
    super.key,
    required this.tripId,
    this.busCapacity = 40,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      // Loads the trip and the live seat map from the backend.
      create: (_) => getIt<PassengerCubit>()..loadSeatMap(tripId),
      child: _SeatSelectionView(tripId: tripId),
    );
  }
}

class _SeatSelectionView extends StatefulWidget {
  final String tripId;
  const _SeatSelectionView({required this.tripId});

  @override
  State<_SeatSelectionView> createState() => _SeatSelectionViewState();
}

class _SeatSelectionViewState extends State<_SeatSelectionView> {
  int? _selectedSeat;

  void _confirmSeat(int seat, double fare) {
    Navigator.pushNamed(context, '/passenger/booking-review', arguments: {
      'tripId': widget.tripId,
      'seatNumber': seat,
      'fare': fare,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Select Your Seat')),
      body: BlocConsumer<PassengerCubit, PassengerState>(
        listener: (context, state) {
          if (state is PassengerError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is SeatSelectionLoading) {
            return const LoadingIndicator(message: 'Loading seat map...');
          }
          if (state is PassengerError) {
            return ErrorDisplay(
              message: state.message,
              onRetry: () => context.read<PassengerCubit>().loadSeatMap(widget.tripId),
            );
          }
          if (state is SeatSelectionLoaded) {
            final fare = state.trip.fareAmount;
            final trip = state.trip;
            return Column(
              children: [
                // Trip context + legend
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  color: AppColors.surface,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (trip.origin != null && trip.destination != null)
                        Text(
                          trip.routeDisplay,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: -0.2),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceVariant,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _LegendItem(color: AppColors.seatAvailable, label: 'Available'),
                            SizedBox(width: 16),
                            _LegendItem(color: AppColors.seatSelected, label: 'Selected'),
                            SizedBox(width: 16),
                            _LegendItem(color: AppColors.seatOccupied, label: 'Occupied'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                // Seat layout (real availability from backend)
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: BusLayout(
                      totalSeats: state.busCapacity,
                      occupiedSeats: state.takenSeats,
                      selectedSeat: _selectedSeat,
                      onSeatTap: (seat) => setState(() => _selectedSeat = seat),
                    ),
                  ),
                ),

                // Bottom bar
                Container(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: const Border(top: BorderSide(color: AppColors.border)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _selectedSeat != null ? 'Seat $_selectedSeat' : 'No seat selected',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: _selectedSeat != null ? AppColors.primary : AppColors.textHint,
                                ),
                              ),
                              Text(
                                _selectedSeat != null
                                    ? Formatters.formatCurrency(fare)
                                    : 'Tap a green seat to select it',
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        AppButton(
                          label: 'Continue',
                          onPressed: _selectedSeat != null ? () => _confirmSeat(_selectedSeat!, fare) : null,
                          icon: Icons.arrow_forward,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
