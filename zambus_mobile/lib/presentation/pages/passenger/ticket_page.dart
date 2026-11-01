import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/passenger/passenger_cubit.dart';
import '../../cubit/passenger/passenger_state.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/error_display.dart';
import '../../widgets/common/loading_indicator.dart';
import '../../widgets/common/ui.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/models.dart';

class TicketPage extends StatelessWidget {
  final String bookingId;
  const TicketPage({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<PassengerCubit>()..getBookingDetails(bookingId),
      child: const _TicketView(),
    );
  }
}

class _TicketView extends StatelessWidget {
  const _TicketView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Your Ticket')),
      body: BlocConsumer<PassengerCubit, PassengerState>(
        listener: (context, state) {
          if (state is PassengerError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is BookingDetailsLoading) {
            return const LoadingIndicator(message: 'Loading ticket...');
          }
          if (state is PassengerError) {
            return ErrorDisplay(
              message: state.message,
              onRetry: () => context.read<PassengerCubit>().refreshBooking(),
            );
          }
          if (state is BookingDetailsLoaded) {
            return _buildTicket(context, state.booking, state.passengerName);
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildTicket(BuildContext context, Booking booking, String? passengerName) {
    final trip = booking.trip;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // ── Ticket card ──────────────────────────────────────────────
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              boxShadow: AppColors.cardShadow,
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                // Header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppColors.primary, AppColors.primaryDark],
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.directions_bus, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'ZAMBUS',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: 2.5,
                              ),
                            ),
                            Text(
                              'BOARDING PASS',
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.white.withValues(alpha: 0.75),
                                letterSpacing: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (trip != null)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              Formatters.formatDisplayDate(trip.departureTime!),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                            ),
                            Text(
                              Formatters.formatDisplayTime(trip.departureTime!),
                              style: TextStyle(
                                  fontSize: 11, color: Colors.white.withValues(alpha: 0.75)),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),

                // Route strip
                if (trip != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            trip.origin ?? '—',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.2),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const Icon(Icons.arrow_forward, size: 16, color: AppColors.textHint),
                        Expanded(
                          child: Text(
                            trip.destination ?? '—',
                            textAlign: TextAlign.end,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.2),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),

                // Perforation
                _TicketPerforation(),

                // QR panel
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: QrImageView(
                          data: booking.qrCodeData,
                          version: QrVersions.auto,
                          size: 190,
                          backgroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Show this code to the conductor for scanning',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),

                const Divider(height: 1),

                // Details
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      if (trip != null)
                        InfoRow(
                          icon: Icons.directions_bus_outlined,
                          label: 'Bus',
                          value: [trip.busReg, trip.busModel].whereType<String>().join(' · '),
                        ),
                      if (trip != null) const Divider(height: 16),
                      InfoRow(icon: Icons.person_outline, label: 'Passenger', value: passengerName ?? 'You'),
                      const Divider(height: 16),
                      InfoRow(icon: Icons.event_seat_outlined, label: 'Seat', value: '${booking.seatNumber}'),
                      const Divider(height: 16),
                      if (trip?.fareAmount != null) ...[
                        InfoRow(
                            icon: Icons.attach_money, label: 'Fare', value: Formatters.formatCurrency(trip!.fareAmount!)),
                        const Divider(height: 16),
                      ],
                      InfoRow(
                          icon: Icons.badge_outlined,
                          label: 'Ticket ID',
                          value: booking.bookingId.substring(0, 8).toUpperCase()),
                      const Divider(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Payment', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                                const SizedBox(height: 4),
                                StatusBadge(label: Formatters.formatPaymentStatus(booking.paymentStatus).toUpperCase()),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Status', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                                const SizedBox(height: 4),
                                StatusBadge(label: Formatters.formatBoardingStatus(booking.boardingStatus).toUpperCase()),
                              ],
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

          const SizedBox(height: 16),

          // Complete payment for a pending booking (e.g. after a failed or
          // abandoned checkout). Seat stays locked until payment confirms.
          if (booking.isPending)
            SizedBox(
              width: double.infinity,
              child: AppButton(
                label: 'Complete Payment',
                onPressed: () => context.read<PassengerCubit>().confirmBooking(booking.bookingId),
                icon: Icons.payment,
              ),
            ),

          const SizedBox(height: 8),

          // Cancel booking (if eligible)
          if (booking.canCancel)
            SizedBox(
              width: double.infinity,
              child: AppButton(
                label: 'Cancel Booking',
                variant: AppButtonVariant.outline,
                onPressed: () => _confirmCancel(context, booking.bookingId),
                icon: Icons.cancel_outlined,
              ),
            ),
        ],
      ),
    );
  }

  void _confirmCancel(BuildContext context, String bookingId) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cancel Booking?'),
        content: const Text(
          'Your seat will be released and the fare refunded to your payment method. This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Keep Ticket'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<PassengerCubit>().cancelBooking(bookingId);
            },
            child: const Text('Cancel Booking'),
          ),
        ],
      ),
    );
  }
}

/// Dashed divider with side notches, mimicking a tear-off ticket edge.
class _TicketPerforation extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 24,
      child: CustomPaint(
        size: Size.infinite,
        painter: _PerforationPainter(),
      ),
    );
  }
}

class _PerforationPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Dashed line
    const dashWidth = 8.0;
    const dashGap = 5.0;
    double x = 0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(x + dashWidth, y), paint);
      x += dashWidth + dashGap;
    }

    // Side notches (half circles cut into the edges)
    final notchPaint = Paint()..color = AppColors.background;
    canvas.drawCircle(Offset(0, y), 10, notchPaint);
    canvas.drawCircle(Offset(size.width, y), 10, notchPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
