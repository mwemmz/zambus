import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/passenger/passenger_cubit.dart';
import '../../cubit/passenger/passenger_state.dart';
import '../../widgets/common/loading_indicator.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/common/ui.dart';
import '../../../core/utils/formatters.dart';

class MyBookingsPage extends StatelessWidget {
  const MyBookingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<PassengerCubit>()..getMyBookings(),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('My Bookings')),
        body: BlocBuilder<PassengerCubit, PassengerState>(
          builder: (context, state) {
            if (state is MyBookingsLoading) {
              return const LoadingIndicator(message: 'Loading bookings...');
            }
            if (state is MyBookingsLoaded) {
              if (state.bookings.isEmpty) {
                return const EmptyState(
                  icon: Icons.confirmation_num_outlined,
                  title: 'No bookings yet',
                  subtitle: 'Your booked tickets will appear here',
                );
              }
              return RefreshIndicator(
                onRefresh: () async => context.read<PassengerCubit>().getMyBookings(),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: state.bookings.length,
                  itemBuilder: (context, index) {
                    final booking = state.bookings[index];
                    final trip = booking.trip;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => Navigator.pushNamed(context, '/passenger/ticket', arguments: booking.bookingId),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 52,
                                height: 52,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      '${booking.seatNumber}',
                                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.primary),
                                    ),
                                    const Text(
                                      'SEAT',
                                      style: TextStyle(fontSize: 8, fontWeight: FontWeight.w600, color: AppColors.textHint, letterSpacing: 0.5),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      trip?.routeDisplay ?? 'Seat ${booking.seatNumber}',
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    if (trip?.departureTime != null)
                                      Text(
                                        Formatters.formatDisplayDateTime(trip!.departureTime!),
                                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                      )
                                    else
                                      Text(
                                        Formatters.formatBoardingStatus(booking.boardingStatus),
                                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                      ),
                                    if (trip?.fareAmount != null) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        Formatters.formatCurrency(trip!.fareAmount!),
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              StatusBadge(label: Formatters.formatPaymentStatus(booking.paymentStatus).toUpperCase(), fontSize: 10),
                              const SizedBox(width: 4),
                              const Icon(Icons.arrow_forward_ios, size: 13, color: AppColors.textHint),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }
}
