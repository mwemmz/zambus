import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../injection_container.dart';
import '../../../data/models/models.dart';
import '../../cubit/driver/driver_cubit.dart';
import '../../cubit/driver/driver_state.dart';
import '../../widgets/common/empty_state.dart';
import '../../widgets/driver/driver_trip_card.dart';

/// Drop-off Alerts Page (DRV-013 / DRV-014)
///
/// Lists the driver's assigned trips first; selecting one shows its
/// manifest grouped by drop-off relevance. Provides its own [DriverCubit]
/// because the page is pushed as a separate route, outside DriverHome's
/// BlocProvider.
class DropoffAlertsPage extends StatelessWidget {
  const DropoffAlertsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final cubit = getIt<DriverCubit>();
        cubit.loadMyTrips();
        return cubit;
      },
      child: const _DropoffAlertsView(),
    );
  }
}

class _DropoffAlertsView extends StatefulWidget {
  const _DropoffAlertsView();

  @override
  State<_DropoffAlertsView> createState() => _DropoffAlertsViewState();
}

class _DropoffAlertsViewState extends State<_DropoffAlertsView> {
  String? _selectedTripId;
  bool _showTripPicker = false;

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
      appBar: AppBar(title: const Text('Drop-off Alerts')),
      body: BlocBuilder<DriverCubit, DriverState>(
        builder: (context, state) {
          if (state is MyTripsLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is MyTripsLoaded) {
            return _buildTripList(state.trips);
          }

          if (state is ManifestLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ManifestLoaded) {
            return _buildManifest(state);
          }

          if (state is DriverError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: AppColors.error),
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

          return const SizedBox.shrink();
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
    if (state is ManifestLoaded) return _buildManifest(state);
    if (state is ManifestLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    return const SizedBox.shrink();
  }

  // ── Manifest view ────────────────────────────────────────────────────────

  Widget _buildManifest(ManifestLoaded state) {
    final manifest = state.manifest;
    final boardedPassengers = manifest.passengers.where((p) => p.isBoarded).toList();
    final droppedOffPassengers = manifest.passengers.where((p) => p.isDroppedOff).toList();
    final pendingPassengers = manifest.passengers.where((p) => p.isNotBoarded).toList();

    return RefreshIndicator(
      onRefresh: () async {
        final tripId = _selectedTripId;
        if (tripId != null) {
          await context.read<DriverCubit>().loadManifest(tripId);
        } else {
          await context.read<DriverCubit>().loadMyTrips();
        }
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Trip info header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${manifest.trip.origin ?? "—"} → ${manifest.trip.destination ?? "—"}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Bus: ${manifest.trip.busReg ?? "—"}  |  Route: ${manifest.trip.routeName ?? "—"}',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Stats summary
          Row(
            children: [
              _StatChip(
                label: 'On Bus',
                count: boardedPassengers.length,
                color: AppColors.success,
              ),
              const SizedBox(width: 8),
              _StatChip(
                label: 'Dropped',
                count: droppedOffPassengers.length,
                color: AppColors.warning,
              ),
              const SizedBox(width: 8),
              _StatChip(
                label: 'Not Boarded',
                count: pendingPassengers.length,
                color: AppColors.textHint,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Passengers to drop off
          if (droppedOffPassengers.isNotEmpty) ...[
            const Text(
              'Dropped Off',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.warning,
              ),
            ),
            const SizedBox(height: 8),
            ...droppedOffPassengers.map(
              (p) => _PassengerTile(
                passenger: p,
                icon: Icons.check_circle,
                iconColor: AppColors.success,
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Boarded passengers (still on bus = upcoming drop-offs)
          if (boardedPassengers.isNotEmpty) ...[
            Text(
              'Still on Bus (${boardedPassengers.length})',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 8),
            ...boardedPassengers.map(
              (p) => _PassengerTile(
                passenger: p,
                icon: Icons.directions_bus,
                iconColor: AppColors.primary,
              ),
            ),
          ],

          if (boardedPassengers.isEmpty &&
              droppedOffPassengers.isEmpty &&
              pendingPassengers.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Column(
                  children: [
                    Icon(Icons.people_outline,
                        size: 64, color: AppColors.textHint),
                    SizedBox(height: 16),
                    Text(
                      'No passengers booked for this trip yet',
                      style: TextStyle(
                        fontSize: 16,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _StatChip({
    required this.label,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PassengerTile extends StatelessWidget {
  final dynamic passenger;
  final IconData icon;
  final Color iconColor;

  const _PassengerTile({
    required this.passenger,
    required this.icon,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconColor.withValues(alpha: 0.1),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(
          passenger.passengerName,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          'Seat ${passenger.seatNumber}  •  ${passenger.passengerPhone.isNotEmpty ? passenger.passengerPhone : "No phone"}',
          style: const TextStyle(fontSize: 13),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            passenger.isBoarded
                ? 'ON BUS'
                : passenger.isDroppedOff
                    ? 'DROPPED'
                    : 'PENDING',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: iconColor,
            ),
          ),
        ),
      ),
    );
  }
}
