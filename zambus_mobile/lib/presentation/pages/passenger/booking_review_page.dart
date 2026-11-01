import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/passenger/passenger_cubit.dart';
import '../../cubit/passenger/passenger_state.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/loading_indicator.dart';
import '../../widgets/common/error_display.dart';
import '../../widgets/common/ui.dart';
import '../../../core/utils/formatters.dart';

class BookingReviewPage extends StatelessWidget {
  final String tripId;
  final int seatNumber;
  const BookingReviewPage({super.key, required this.tripId, required this.seatNumber});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<PassengerCubit>()..getTripDetails(tripId),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Review Booking')),
        body: BlocConsumer<PassengerCubit, PassengerState>(
          listener: (context, state) {
            if (state is BookingConfirmed) {
              // Booking is CONFIRMED with final QR data - go to the ticket.
              Navigator.pushReplacementNamed(context, '/passenger/ticket', arguments: state.booking.bookingId);
            } else if (state is PassengerError) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
              );
            }
          },
          builder: (context, state) {
            if (state is TripDetailsLoading) {
              return const LoadingIndicator(message: 'Loading trip...');
            }
            if (state is BookingCreating) {
              return const LoadingIndicator(message: 'Processing payment...');
            }
            if (state is PassengerError) {
              // Booking/payment failed (e.g. seat taken while reviewing).
              // The listener already showed a snackbar; give the user a way
              // out instead of a blank screen.
              return ErrorDisplay(
                message: state.message,
                onRetry: () {
                  Navigator.of(context).pop();
                },
                retryLabel: 'Go Back & Re-select Seat',
              );
            }
            if (state is TripDetailsLoaded) {
              final trip = state.trip;
              return Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Journey summary card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              children: [
                                InfoRow(
                                  icon: Icons.route_outlined,
                                  label: 'Route',
                                  value: '${trip.origin ?? "—"} to ${trip.destination ?? "—"}',
                                ),
                                const Divider(height: 16),
                                InfoRow(
                                  icon: Icons.calendar_today_outlined,
                                  label: 'Date',
                                  value: Formatters.formatDisplayDate(trip.departureTime),
                                ),
                                const Divider(height: 16),
                                InfoRow(
                                  icon: Icons.schedule_outlined,
                                  label: 'Departure',
                                  value: Formatters.formatDisplayTime(trip.departureTime),
                                ),
                                const Divider(height: 16),
                                InfoRow(
                                  icon: Icons.directions_bus_outlined,
                                  label: 'Bus',
                                  value: [trip.bus?.model, trip.bus?.registrationNumber]
                                      .whereType<String>()
                                      .join(' · '),
                                ),
                                const Divider(height: 16),
                                InfoRow(
                                  icon: Icons.event_seat_outlined,
                                  label: 'Seat Number',
                                  value: '$seatNumber',
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Fare banner
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [AppColors.primary, AppColors.primaryDark],
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                const Expanded(
                                  child: Text(
                                    'Total Fare',
                                    style: TextStyle(fontSize: 14, color: Colors.white70),
                                  ),
                                ),
                                Text(
                                  Formatters.formatCurrency(trip.fareAmount),
                                  style: const TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                    letterSpacing: -0.8,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Payment notice
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.infoLight,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.info_outline, color: AppColors.info, size: 20),
                                SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    'Mock payment for Phase 1. No real payment will be processed.',
                                    style: TextStyle(fontSize: 13, color: AppColors.info),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),

                  // Sticky confirm bar
                  Container(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
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
                      child: AppButton(
                        label: 'Confirm Payment - ${Formatters.formatCurrency(trip.fareAmount)}',
                        onPressed: () {
                          // Creates the booking (locks the seat) then confirms
                          // payment, producing the final QR ticket.
                          context.read<PassengerCubit>().bookAndPay(tripId, seatNumber);
                        },
                        icon: Icons.payment,
                      ),
                    ),
                  ),
                ],
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }
}
