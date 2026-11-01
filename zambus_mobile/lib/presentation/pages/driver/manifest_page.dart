import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../injection_container.dart';
import '../../../data/models/models.dart';
import '../../cubit/driver/driver_cubit.dart';
import '../../cubit/driver/driver_state.dart';
import '../../widgets/common/loading_indicator.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/driver/driver_trip_card.dart';

/// Passenger manifest for a trip. The driver first picks one of their
/// assigned trips, then sees the boarding list for it. Provides its own
/// [DriverCubit] because the page is pushed as a separate route, outside
/// DriverHome's BlocProvider.
class ManifestPage extends StatelessWidget {
  final String? tripId;

  const ManifestPage({super.key, this.tripId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final cubit = getIt<DriverCubit>();
        cubit.loadMyTrips();
        return cubit;
      },
      child: _ManifestView(initialTripId: tripId),
    );
  }
}

class _ManifestView extends StatefulWidget {
  final String? initialTripId;

  const _ManifestView({this.initialTripId});

  @override
  State<_ManifestView> createState() => _ManifestViewState();
}

class _ManifestViewState extends State<_ManifestView> {
  String? _selectedTripId;
  bool _showTripPicker = false;
  bool _initialLoadDone = false;

  void _openTrip(String tripId) {
    setState(() {
      _selectedTripId = tripId;
      _showTripPicker = false;
    });
    context.read<DriverCubit>().loadManifest(tripId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Passenger Manifest')),
      body: BlocConsumer<DriverCubit, DriverState>(
        listener: (context, state) {
          // If opened with a pre-selected trip (e.g. from a notification),
          // load its manifest once the driver's trips arrive.
          if (state is MyTripsLoaded && !_initialLoadDone) {
            _initialLoadDone = true;
            if (widget.initialTripId != null && widget.initialTripId!.isNotEmpty) {
              _openTrip(widget.initialTripId!);
            }
          }
          if (state is BoardingMarked) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Passenger status updated'),
                backgroundColor: AppColors.success,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is MyTripsLoading) {
            return const LoadingIndicator(message: 'Loading your trips...');
          }

          if (state is MyTripsLoaded) {
            return _buildTripList(state.trips);
          }

          if (state is ManifestLoading) {
            return const LoadingIndicator(message: 'Loading manifest...');
          }

          if (state is ManifestLoaded) {
            return _buildManifest(state.manifest);
          }

          if (state is DriverError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(state.message, textAlign: TextAlign.center),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<DriverCubit>().loadMyTrips(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return const EmptyState(
            icon: Icons.list_alt,
            title: 'No trip selected',
            subtitle: 'Pick one of your assigned trips to view its manifest',
          );
        },
      ),
    );
  }

  // ── Trip picker ──────────────────────────────────────────────────────────

  Widget _buildTripList(List<Trip> trips) {
    if (_selectedTripId == null) {
      return trips.isEmpty
          ? const EmptyState(
              icon: Icons.route_outlined,
              title: 'No assigned trips',
              subtitle: 'You have no trips assigned yet. Contact your operator.',
            )
          : RefreshIndicator(
              onRefresh: () async => context.read<DriverCubit>().loadMyTrips(),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: trips.length,
                itemBuilder: (context, index) {
                  final trip = trips[index];
                  return DriverTripCard(
                    trip: trip,
                    onTap: () => _openTrip(trip.tripId),
                  );
                },
              ),
            );
    }

    // A trip is selected — show the manifest, with a header to switch trips.
    Trip? selected;
    for (final t in trips) {
      if (t.tripId == _selectedTripId) selected = t;
    }
    return Column(
      children: [
        Material(
          color: AppColors.surface,
          child: ListTile(
            leading: const Icon(Icons.directions_bus, color: AppColors.primary),
            title: Text(
              selected?.routeDisplay ?? 'Selected trip',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              selected != null
                  ? 'Departs ${Formatters.formatDisplayDateTime(selected.departureTime)}'
                  : 'Tap to switch trips',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            trailing: TextButton.icon(
              onPressed: () => setState(() => _showTripPicker = !_showTripPicker),
              icon: Icon(_showTripPicker ? Icons.expand_less : Icons.swap_horiz),
              label: const Text('Switch'),
            ),
          ),
        ),
        const Divider(height: 1),
        if (_showTripPicker)
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: trips.length,
              itemBuilder: (context, index) {
                final trip = trips[index];
                return DriverTripCard(
                  trip: trip,
                  onTap: () => _openTrip(trip.tripId),
                );
              },
            ),
          )
        else
          Expanded(child: _buildManifestForSelectedTrip()),
      ],
    );
  }

  Widget _buildManifestForSelectedTrip() {
    final state = context.watch<DriverCubit>().state;
    if (state is ManifestLoaded) return _buildManifest(state.manifest);
    if (state is ManifestLoading) {
      return const LoadingIndicator(message: 'Loading manifest...');
    }
    return const SizedBox.shrink();
  }

  // ── Manifest view ────────────────────────────────────────────────────────

  Widget _buildManifest(Manifest manifest) {
    return RefreshIndicator(
      onRefresh: () async {
        final tripId = _selectedTripId;
        if (tripId != null) {
          await context.read<DriverCubit>().loadManifest(tripId);
        } else {
          await context.read<DriverCubit>().loadMyTrips();
        }
      },
      child: Column(
        children: [
          // Trip info header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: AppColors.primary.withValues(alpha: 0.05),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${manifest.trip.origin ?? "Origin"} to ${manifest.trip.destination ?? "Destination"}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  'Bus: ${manifest.trip.busReg ?? "N/A"} | Departure: ${Formatters.formatDisplayDateTime(manifest.trip.departureTime)}',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),

          // Stats
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                _StatChip(label: 'Total', value: '${manifest.totals.totalPassengers}', color: AppColors.primary),
                const SizedBox(width: 8),
                _StatChip(label: 'Boarded', value: '${manifest.totals.boarded}', color: AppColors.success),
                const SizedBox(width: 8),
                _StatChip(label: 'Pending', value: '${manifest.totals.notBoarded}', color: AppColors.warning),
                const SizedBox(width: 8),
                _StatChip(label: 'Dropped', value: '${manifest.totals.droppedOff}', color: AppColors.info),
              ],
            ),
          ),

          // Passenger list
          Expanded(
            child: manifest.passengers.isEmpty
                ? const EmptyState(
                    icon: Icons.people_outline,
                    title: 'No passengers',
                    subtitle: 'No bookings for this trip yet',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: manifest.passengers.length,
                    itemBuilder: (context, index) {
                      final p = manifest.passengers[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: p.isBoarded
                                ? AppColors.successLight
                                : AppColors.surfaceVariant,
                            child: Text(
                              '${p.seatNumber}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: p.isBoarded ? AppColors.success : AppColors.textSecondary,
                              ),
                            ),
                          ),
                          title: Text(p.passengerName, style: const TextStyle(fontWeight: FontWeight.w500)),
                          subtitle: Text('Seat ${p.seatNumber}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(p.boardingStatus).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  Formatters.formatBoardingStatus(p.boardingStatus),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: _getStatusColor(p.boardingStatus),
                                  ),
                                ),
                              ),
                              // Drop-off action for boarded passengers
                              if (p.isBoarded)
                                IconButton(
                                  icon: const Icon(Icons.flag, size: 20, color: AppColors.info),
                                  tooltip: 'Mark dropped off',
                                  onPressed: () {
                                    context.read<DriverCubit>().markAsDroppedOff(p.bookingId);
                                  },
                                ),
                              // Board action for pending passengers
                              if (p.isNotBoarded && p.paymentStatus == 'CONFIRMED')
                                IconButton(
                                  icon: const Icon(Icons.check_circle_outline, size: 20, color: AppColors.success),
                                  tooltip: 'Mark boarded',
                                  onPressed: () {
                                    context.read<DriverCubit>().markAsBoarded(p.bookingId);
                                  },
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    return switch (status) {
      'BOARDED' => AppColors.success,
      'DROPPED_OFF' => AppColors.info,
      _ => AppColors.warning,
    };
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
            Text(label, style: TextStyle(fontSize: 11, color: color)),
          ],
        ),
      ),
    );
  }
}
