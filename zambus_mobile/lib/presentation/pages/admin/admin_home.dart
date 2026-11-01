import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/datasources/api_datasource.dart';
import '../../../injection_container.dart';
import '../../cubit/auth/auth_cubit.dart';
import '../../cubit/auth/auth_state.dart';
import '../../widgets/common/auth_listener.dart';
import '../../widgets/common/ui.dart';

class AdminHome extends StatefulWidget {
  const AdminHome({super.key});

  @override
  State<AdminHome> createState() => _AdminHomeState();
}

class _AdminHomeState extends State<AdminHome> {
  int _pendingCompanies = 0;
  int _pendingBuses = 0;
  int _pendingRoutes = 0;

  @override
  void initState() {
    super.initState();
    _loadPendingCounts();
  }

  Future<void> _loadPendingCounts() async {
    try {
      final datasource = getIt<ApiDatasource>();
      final companiesFuture = datasource.getPendingCompanies();
      final busesFuture = datasource.getAdminBuses(status: 'PENDING');
      final routesFuture = datasource.getAdminRoutes(status: 'PENDING');
      final companies = await companiesFuture;
      final buses = await busesFuture;
      final routes = await routesFuture;
      if (!mounted) return;
      setState(() {
        _pendingCompanies = companies.length;
        _pendingBuses = buses.length;
        _pendingRoutes = routes.length;
      });
    } catch (_) {
      // Non-critical dashboard info; the approvals page will surface errors.
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthListener(
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Admin'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Sign out',
              onPressed: () => context.read<AuthCubit>().logout(),
            ),
          ],
        ),
        body: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: _loadPendingCounts,
          child: BlocBuilder<AuthCubit, AuthState>(
            builder: (context, authState) {
              final user = authState is AuthAuthenticated ? authState.user : null;
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                children: [
                  // Header banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.primary, Color(0xFF123B96)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Welcome, ${user?.fullName ?? 'Admin'}',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                  letterSpacing: -0.3,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'System Administrator',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.white.withValues(alpha: 0.8),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.admin_panel_settings_outlined,
                              color: Colors.white, size: 26),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Review queue summary
                  SectionHeader(
                    title: 'Review Queue',
                    subtitle:
                        '${_pendingCompanies + _pendingBuses + _pendingRoutes} item(s) awaiting your decision',
                  ),
                  _AdminActionCard(
                    icon: Icons.fact_check_outlined,
                    title: 'Approvals',
                    subtitle: 'Review companies, buses and routes',
                    badgeCount: _pendingCompanies + _pendingBuses + _pendingRoutes,
                    color: AppColors.warning,
                    onTap: () => Navigator.pushNamed(context, '/admin/approvals')
                        .then((_) => _loadPendingCounts()),
                  ),
                  const SizedBox(height: 12),

                  SectionHeader(title: 'Administration'),
                  _AdminActionCard(
                    icon: Icons.people_outline,
                    title: 'User Management',
                    subtitle: 'Manage user roles and permissions',
                    color: AppColors.primary,
                    onTap: () => Navigator.pushNamed(context, '/admin/users'),
                  ),
                  const SizedBox(height: 12),
                  _AdminActionCard(
                    icon: Icons.settings_outlined,
                    title: 'System Settings',
                    subtitle: 'Commission, currency and platform config',
                    color: AppColors.secondary,
                    onTap: () => Navigator.pushNamed(context, '/admin/settings'),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _AdminActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final int? badgeCount;
  final VoidCallback onTap;

  const _AdminActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
    this.badgeCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: color, size: 25),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (badgeCount != null && badgeCount! > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.error,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '$badgeCount',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  )
                else
                  const Icon(Icons.chevron_right, color: AppColors.textHint),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
