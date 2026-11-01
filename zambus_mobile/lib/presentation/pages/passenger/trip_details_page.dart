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
import '../../widgets/map/route_map_widget.dart';
import '../../../core/utils/formatters.dart';

class TripDetailsPage extends StatelessWidget {
  final String tripId;
  const TripDetailsPage({super.key, required this.tripId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<PassengerCubit>()..getTripDetails(tripId),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Trip Details')),
        body: BlocBuilder<PassengerCubit, PassengerState>(
          builder: (context, state) {
            if (state is TripDetailsLoading) {
              return const LoadingIndicator(message: 'Loading trip details...');
            }
            if (state is TripDetailsLoaded) {
              return _TripDetailsView(trip: state.trip);
            }
            if (state is PassengerError) {
              return ErrorDisplay(message: state.message, onRetry: () {
                context.read<PassengerCubit>().getTripDetails(tripId);
              });
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }
}

class _TripDetailsView extends StatelessWidget {
  final dynamic trip;
  const _TripDetailsView({required this.trip});

  @override
  Widget build(BuildContext context) {
    final soldOut = trip.remainingSeats != null && trip.remainingSeats! <= 0;
    final bookable = trip.canBook && !soldOut;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Route header with timeline
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppColors.primary, AppColors.primaryDark],
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  Formatters.formatDisplayTime(trip.departureTime),
                                  style: const TextStyle(
                                      fontSize: 26, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: -0.6),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  trip.origin ?? 'Origin',
                                  style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.85)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Column(
                              children: [
                                StatusBadge(
                                  label: Formatters.tripDuration(trip.departureTime, trip.estimatedArrival),
                                  background: Colors.white.withValues(alpha: 0.18),
                                  foreground: Colors.white,
                                ),
                                const SizedBox(height: 6),
                                SizedBox(
                                  width: 72,
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      Row(
                                        children: [
                                          const Expanded(
                                            child: Divider(
                                              thickness: 1.5,
                                              color: Color(0x66FFFFFF),
                                            ),
                                          ),
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                                color: Colors.white, shape: BoxShape.circle),
                                          ),
                                          const Expanded(
                                            child: Divider(
                                              thickness: 1.5,
                                              color: Color(0x66FFFFFF),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  Formatters.formatDisplayTime(trip.estimatedArrival),
                                  style: const TextStyle(
                                      fontSize: 26, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: -0.6),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  trip.destination ?? 'Destination',
                                  style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.85)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      // Date + status chips
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          StatusBadge(
                            label: Formatters.formatDisplayDate(trip.departureTime),
                            background: Colors.white.withValues(alpha: 0.18),
                            foreground: Colors.white,
                            icon: Icons.calendar_today_outlined,
                          ),
                          const SizedBox(width: 8),
                          StatusBadge(
                            label: Formatters.formatTripStatus(trip.status),
                            background: Colors.white.withValues(alpha: 0.18),
                            foreground: Colors.white,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Trip info
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      InfoRow(
                          icon: Icons.directions_bus_outlined,
                          label: 'Bus',
                          value:
                              '${trip.bus?.model ?? "N/A"} (${trip.bus?.registrationNumber ?? "N/A"})'),
                      const Divider(height: 16),
                      InfoRow(
                          icon: Icons.event_seat_outlined,
                          label: 'Capacity',
                          value: '${trip.bus?.seatCapacity ?? 40} seats'),
                      const Divider(height: 16),
                      InfoRow(
                          icon: Icons.star_outline,
                          label: 'Category',
                          value: Formatters.formatBusCategory(trip.busCategory)),
                      const Divider(height: 16),
                      InfoRow(
                          icon: Icons.attach_money,
                          label: 'Fare',
                          value: Formatters.formatCurrency(trip.fareAmount)),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Route map (Zambian cities; falls back to placeholder
                // when a city is not in the predefined coordinate set).
                if (trip.origin != null && trip.destination != null) ...[
                  RouteMapWidget(
                    origin: trip.origin,
                    destination: trip.destination,
                    intermediateStops: trip.route?.intermediateStops ?? const [],
                    height: 220,
                  ),
                  const SizedBox(height: 20),
                ],

                // Availability banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: bookable
                        ? AppColors.successLight
                        : (soldOut ? AppColors.errorLight : AppColors.warningLight),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        bookable ? Icons.check_circle : Icons.warning_amber_rounded,
                        color: bookable ? AppColors.success : (soldOut ? AppColors.error : AppColors.warning),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          soldOut
                              ? 'This trip is sold out'
                              : trip.canBook
                                  ? 'Booking is open — ${trip.remainingSeats ?? '?'} seats available'
                                  : 'Booking is not available (${Formatters.formatTripStatus(trip.status)})',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: bookable ? AppColors.success : (soldOut ? AppColors.error : AppColors.warning),
                          ),
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

        // Sticky booking bar
        if (bookable)
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
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        Formatters.formatCurrency(trip.fareAmount),
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.primary, letterSpacing: -0.4),
                      ),
                      const Text('per seat', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: AppButton(
                      label: 'Select Seat',
                      onPressed: () {
                        Navigator.pushNamed(context, '/passenger/seat-selection', arguments: {
                          'tripId': trip.tripId,
                          'busCapacity': trip.bus?.seatCapacity ?? 40,
                        });
                      },
                      icon: Icons.event_seat,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
