import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/auth/auth_cubit.dart';
import '../../cubit/auth/auth_state.dart';
import '../../cubit/passenger/passenger_cubit.dart';
import '../../cubit/passenger/passenger_state.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/auth_listener.dart';
import '../../widgets/common/ui.dart';
import '../../../data/models/trip_model.dart';
import '../../../core/utils/formatters.dart';

class PassengerHome extends StatelessWidget {
  const PassengerHome({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<PassengerCubit>(),
      child: const _PassengerHomeView(),
    );
  }
}

class _PassengerHomeView extends StatefulWidget {
  const _PassengerHomeView();

  @override
  State<_PassengerHomeView> createState() => _PassengerHomeViewState();
}

class _PassengerHomeViewState extends State<_PassengerHomeView> {
  final _originController = TextEditingController();
  final _destinationController = TextEditingController();
  int _selectedIndex = 0;
  DateTime? _travelDate;
  String? _filter;

  static const _filters = <String?, String>{
    null: 'Any',
    'lowestPrice': 'Cheapest',
    'earliestDeparture': 'Earliest',
    'luxury': 'Luxury',
    'semiLuxury': 'Semi-Luxury',
    'standard': 'Standard',
  };

  @override
  void dispose() {
    _originController.dispose();
    _destinationController.dispose();
    super.dispose();
  }

  void _searchTrips() {
    FocusScope.of(context).unfocus();
    context.read<PassengerCubit>().searchTrips(
      origin: _originController.text.trim().isNotEmpty ? _originController.text.trim() : null,
      destination: _destinationController.text.trim().isNotEmpty ? _destinationController.text.trim() : null,
      travelDate: _travelDate != null ? Formatters.formatDate(_travelDate!) : null,
      filter: _filter,
    );
  }

  Future<void> _pickTravelDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _travelDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) => Theme(data: Theme.of(context), child: child!),
    );
    if (picked != null) {
      setState(() => _travelDate = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    // AuthListener returns the user to login when AuthCubit emits
    // AuthUnauthenticated. The AuthGate in main.dart is replaced during
    // login, so this page needs its own listener for sign-out to work.
    return AuthListener(
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: IndexedStack(
          index: _selectedIndex,
          children: [
            _buildSearchTab(),
            const MyBookingsTab(),
            _buildProfileTab(),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: (index) => setState(() => _selectedIndex = index),
          backgroundColor: AppColors.surface,
          indicatorColor: AppColors.primary.withValues(alpha: 0.1),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search, color: AppColors.primary), label: 'Search'),
            NavigationDestination(icon: Icon(Icons.confirmation_num_outlined), selectedIcon: Icon(Icons.confirmation_num, color: AppColors.primary), label: 'Bookings'),
            NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: AppColors.primary), label: 'Profile'),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchTab() {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: GradientPageHeader(
            title: 'Where to today?',
            subtitle: 'Search and book your next trip',
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                boxShadow: AppColors.cardShadow,
              ),
              child: Column(
                children: [
                  _buildSearchField('From', _originController, Icons.trip_origin, TextInputAction.next),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      children: [
                        const SizedBox(width: 42),
                        SizedBox(
                          height: 10,
                          child: CustomPaint(
                            size: const Size(14, 10),
                            painter: _ConnectorPainter(),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildSearchField('To', _destinationController, Icons.location_on_outlined, TextInputAction.search),
                  const SizedBox(height: 12),
                  _buildDateField(),
                  const SizedBox(height: 16),
                  BlocBuilder<PassengerCubit, PassengerState>(
                    builder: (context, state) {
                      return AppButton(
                        label: 'Find Trips',
                        onPressed: _searchTrips,
                        isLoading: state is TripsLoading,
                        icon: Icons.search,
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: _buildFilterChips(),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: BlocBuilder<PassengerCubit, PassengerState>(
              builder: (context, state) {
                if (state is TripsLoaded) {
                  if (state.trips.isEmpty) {
                    return const _SearchMessage(
                      icon: Icons.search_off,
                      title: 'No trips found',
                      subtitle: 'Try a different route, date or filter.',
                    );
                  }
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SectionHeader(title: 'Available Trips', subtitle: '${state.trips.length} trip${state.trips.length == 1 ? '' : 's'} match your search'),
                      ...state.trips.map((trip) => _TripCard(trip: trip)),
                    ],
                  );
                }
                if (state is TripsLoading) {
                  return const Padding(
                    padding: EdgeInsets.all(40),
                    child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                  );
                }
                if (state is PassengerError) {
                  return _SearchMessage(
                    icon: Icons.wifi_off,
                    title: 'Search failed',
                    subtitle: state.message,
                    actionLabel: 'Retry',
                    onAction: _searchTrips,
                  );
                }
                // Initial state - show featured routes
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(title: 'Popular Routes', subtitle: 'Quick searches across Zambia'),
                    _QuickRoute(from: 'Lusaka', to: 'Livingstone', distance: '485 km', onTap: () => _searchRoute('Lusaka', 'Livingstone')),
                    _QuickRoute(from: 'Lusaka', to: 'Ndola', distance: '320 km', onTap: () => _searchRoute('Lusaka', 'Ndola')),
                    _QuickRoute(from: 'Lusaka', to: 'Kitwe', distance: '365 km', onTap: () => _searchRoute('Lusaka', 'Kitwe')),
                    _QuickRoute(from: 'Lusaka', to: 'Mongu', distance: '590 km', onTap: () => _searchRoute('Lusaka', 'Mongu')),
                  ],
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  void _searchRoute(String from, String to) {
    _originController.text = from;
    _destinationController.text = to;
    _searchTrips();
  }

  Widget _buildFilterChips() {
    return SizedBox(
      height: 52,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        children: _filters.entries.map((entry) {
          final selected = _filter == entry.key;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(entry.value),
              selected: selected,
              selectedColor: AppColors.primary,
              backgroundColor: AppColors.surface,
              side: BorderSide(color: selected ? AppColors.primary : AppColors.border),
              labelStyle: TextStyle(
                fontSize: 13,
                color: selected ? Colors.white : AppColors.textSecondary,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              ),
              showCheckmark: false,
              onSelected: (_) => setState(() => _filter = entry.key),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildDateField() {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: _pickTravelDate,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today_outlined, color: AppColors.textSecondary, size: 20),
            const SizedBox(width: 12),
            Text(
              _travelDate != null ? Formatters.formatDisplayDate(_travelDate!) : 'Today',
              style: TextStyle(
                color: _travelDate != null ? AppColors.textPrimary : AppColors.textSecondary,
                fontSize: 15,
                fontWeight: _travelDate != null ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
            const Spacer(),
            if (_travelDate != null)
              GestureDetector(
                onTap: () => setState(() => _travelDate = null),
                child: const Icon(Icons.close, color: AppColors.textHint, size: 18),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchField(String label, TextEditingController controller, IconData icon, TextInputAction action) {
    return TextField(
      controller: controller,
      textInputAction: action,
      onSubmitted: (_) => _searchTrips(),
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: label,
        hintStyle: const TextStyle(color: AppColors.textHint, fontWeight: FontWeight.w400),
        prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
        filled: true,
        fillColor: AppColors.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  Widget _buildProfileTab() {
    return BlocBuilder<AuthCubit, AuthState>(
      builder: (context, state) {
        final user = state is AuthAuthenticated ? state.user : null;
        return SafeArea(
          top: true,
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 8),
              // Profile card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppColors.primary,
                      child: Text(
                        (user?.fullName ?? 'U')[0].toUpperCase(),
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.fullName ?? 'User',
                            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.2),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            user?.email ?? '',
                            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 20, color: AppColors.textSecondary),
                      onPressed: _showEditProfileDialog,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              const SectionHeader(title: 'Account', subtitle: 'Manage your profile and bookings'),
              _ProfileTile(icon: Icons.person_outline, title: 'Edit Profile', subtitle: 'Update your name and phone number', onTap: _showEditProfileDialog),
              _ProfileTile(icon: Icons.confirmation_num_outlined, title: 'My Bookings', subtitle: 'View tickets and boarding passes', onTap: () => setState(() => _selectedIndex = 1)),
              _ProfileTile(icon: Icons.help_outline, title: 'Help & Support', subtitle: 'Get help with bookings and trips', onTap: _showSupportDialog),
              _ProfileTile(icon: Icons.info_outline, title: 'About ZamBus', subtitle: 'Version, credits and licenses', onTap: _showAboutDialog),
              const SizedBox(height: 24),
              AppButton(
                label: 'Sign Out',
                onPressed: _confirmSignOut,
                variant: AppButtonVariant.outline,
                icon: Icons.logout,
              ),
            ],
          ),
        );
      },
    );
  }

  /// Asks the user to confirm before signing out, then clears the session.
  /// AuthListener handles the navigation back to login.
  void _confirmSignOut() {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out of ZamBus?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Stay'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<AuthCubit>().logout();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  void _showEditProfileDialog() {
    final authCubit = context.read<AuthCubit>();
    final state = authCubit.state;
    final user = state is AuthAuthenticated ? state.user : null;
    final nameController = TextEditingController(text: user?.fullName ?? '');
    final phoneController = TextEditingController(text: user?.phoneNumber ?? '');

    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Edit Profile'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Full Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                decoration: const InputDecoration(labelText: 'Phone Number'),
                keyboardType: TextInputType.phone,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                final navigator = Navigator.of(dialogContext);
                await authCubit.updateProfile(
                  fullName: nameController.text.trim(),
                  phoneNumber: phoneController.text.trim(),
                );
                if (!mounted) return;
                navigator.pop();
                final isError = authCubit.state is AuthError;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(isError ? 'Could not update profile' : 'Profile updated'),
                    backgroundColor: isError ? AppColors.error : AppColors.success,
                  ),
                );
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  void _showSupportDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Help & Support'),
        content: const Text(
          'Need help with a booking or trip?\n\n'
          'Email: support@zambus.app\n'
          'Phone: +260 800 000 000\n\n'
          'Our support team is available daily from 06:00 to 22:00.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog() {
    showAboutDialog(
      context: context,
      applicationName: 'ZamBus',
      applicationVersion: '1.0.0',
      applicationIcon: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.directions_bus, color: Colors.white),
      ),
      children: const [
        Text('ZamBus - Smart Digital Intercity Bus Management System for Zambia.'),
      ],
    );
  }
}

/// Small connector line drawn between the From and To fields.
class _ConnectorPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawLine(Offset(size.width / 2, 0), Offset(size.width / 2, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TripCard extends StatelessWidget {
  final Trip trip;
  const _TripCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final soldOut = trip.remainingSeats != null && trip.remainingSeats! <= 0;
    final bookable = trip.canBook && !soldOut;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: bookable
            ? () => Navigator.pushNamed(context, '/passenger/trip-details', arguments: trip.tripId)
            : null,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Route line: origin - connector - destination
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          Formatters.formatDisplayTime(trip.departureTime),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.3),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          trip.origin ?? 'Origin',
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Column(
                    children: [
                      Text(
                        Formatters.tripDuration(trip.departureTime, trip.estimatedArrival),
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textHint),
                      ),
                      const SizedBox(height: 2),
                      SizedBox(
                        width: 64,
                        child: Row(
                          children: [
                            const Expanded(child: Divider(thickness: 1.5, color: AppColors.border)),
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                            ),
                            const Expanded(child: Divider(thickness: 1.5, color: AppColors.border)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          Formatters.formatDisplayTime(trip.estimatedArrival),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.3),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          trip.destination ?? 'Destination',
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 12),
              // Meta row: fare, category, seats, status
              Row(
                children: [
                  Text(
                    Formatters.formatCurrency(trip.fareAmount),
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppColors.primary, letterSpacing: -0.3),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge(label: Formatters.formatBusCategory(trip.busCategory)),
                  const Spacer(),
                  if (trip.remainingSeats != null) ...[
                    Icon(Icons.event_seat, size: 14, color: soldOut ? AppColors.error : AppColors.success),
                    const SizedBox(width: 4),
                    Text(
                      soldOut ? 'Sold Out' : '${trip.remainingSeats} left',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: soldOut ? AppColors.error : AppColors.success,
                      ),
                    ),
                    const SizedBox(width: 10),
                  ],
                  StatusBadge(
                    label: Formatters.formatTripStatus(trip.status).toUpperCase(),
                    fontSize: 10,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickRoute extends StatelessWidget {
  final String from;
  final String to;
  final String distance;
  final VoidCallback onTap;
  const _QuickRoute({required this.from, required this.to, required this.distance, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.directions_bus_outlined, color: AppColors.primary, size: 20),
        ),
        title: Text(
          '$from - $to',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(distance, style: const TextStyle(fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textHint),
        onTap: onTap,
      ),
    );
  }
}

class _SearchMessage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _SearchMessage({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
        child: Column(
          children: [
            Icon(icon, size: 56, color: AppColors.textHint),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.refresh),
                label: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ProfileTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textHint),
        onTap: onTap,
      ),
    );
  }
}

class MyBookingsTab extends StatelessWidget {
  const MyBookingsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<PassengerCubit>()..getMyBookings(),
      child: Builder(
        builder: (context) {
          return SafeArea(
            top: true,
            bottom: false,
            child: BlocBuilder<PassengerCubit, PassengerState>(
              builder: (context, state) {
                if (state is MyBookingsLoading) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.primary));
                }
              if (state is MyBookingsLoaded) {
                if (state.bookings.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.06),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.confirmation_num_outlined, size: 40, color: AppColors.textHint),
                        ),
                        const SizedBox(height: 20),
                        const Text('No bookings yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 48),
                          child: Text(
                            'Search for a trip and your tickets will appear here',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        ),
                        const SizedBox(height: 20),
                        OutlinedButton.icon(
                          onPressed: () => context.read<PassengerCubit>().getMyBookings(),
                          icon: const Icon(Icons.refresh),
                          label: const Text('Refresh'),
                        ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () => context.read<PassengerCubit>().getMyBookings(),
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    itemCount: state.bookings.length,
                    itemBuilder: (context, index) {
                      final booking = state.bookings[index];
                      return _BookingCard(booking: booking);
                    },
                  ),
                );
              }
              if (state is PassengerError) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.wifi_off, size: 56, color: AppColors.textHint),
                      const SizedBox(height: 16),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(state.message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: () => context.read<PassengerCubit>().getMyBookings(),
                        icon: const Icon(Icons.refresh),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                );
              }
              return const Center(child: Text('Pull down to refresh'));
            },
          ),
        );
      },
    ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final dynamic booking;
  const _BookingCard({required this.booking});

  @override
  Widget build(BuildContext context) {
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
              // Seat chip
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
  }
}
