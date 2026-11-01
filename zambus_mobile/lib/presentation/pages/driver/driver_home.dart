import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/router/app_router.dart';
import '../../../injection_container.dart';
import '../../cubit/auth/auth_cubit.dart';
import '../../cubit/auth/auth_state.dart';
import '../../cubit/driver/driver_cubit.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/auth_listener.dart';

class DriverHome extends StatelessWidget {
  const DriverHome({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<DriverCubit>(),
      child: AuthListener(
        child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Driver Dashboard'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () => context.read<AuthCubit>().logout(),
            ),
          ],
        ),
        body: BlocBuilder<AuthCubit, AuthState>(
          builder: (context, authState) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Welcome
                  if (authState is AuthAuthenticated)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.driverColor,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome, ${authState.user.fullName}',
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Driver Dashboard',
                            style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.8)),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 24),

                  const Text('Quick Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),

                  // QR Scanner
                  _ActionCard(
                    icon: Icons.qr_code_scanner,
                    title: 'Scan Ticket',
                    subtitle: 'Scan passenger QR codes for boarding',
                    color: AppColors.primary,
                    onTap: () => Navigator.pushNamed(context, '/driver/scan'),
                  ),
                  const SizedBox(height: 12),

                  // Manifest
                  _ActionCard(
                    icon: Icons.list_alt,
                    title: 'Passenger Manifest',
                    subtitle: 'View boarding list and statuses',
                    color: AppColors.secondary,
                    onTap: () => Navigator.pushNamed(context, '/driver/manifest'),
                  ),
                  const SizedBox(height: 12),

                  // Drop-off Alerts
                  _ActionCard(
                    icon: Icons.notifications_active_outlined,
                    title: 'Drop-off Alerts',
                    subtitle: 'View upcoming passenger drop-offs',
                    color: AppColors.warning,
                    onTap: () => Navigator.pushNamed(context, '/driver/dropoff'),
                  ),
                  const SizedBox(height: 12),

                  // Emergency
                  _ActionCard(
                    icon: Icons.emergency,
                    title: 'Report Emergency',
                    subtitle: 'Breakdown, accident, or severe delay',
                    color: AppColors.error,
                    onTap: () => Navigator.pushNamed(context, '/driver/emergency'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textHint),
            ],
          ),
        ),
      ),
    );
  }
}
