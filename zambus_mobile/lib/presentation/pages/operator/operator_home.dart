import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/auth/auth_cubit.dart';
import '../../cubit/auth/auth_state.dart';
import '../../cubit/operator/operator_cubit.dart';
import '../../cubit/operator/operator_state.dart';
import '../../widgets/common/auth_listener.dart';
import '../../widgets/common/ui.dart';

class OperatorHome extends StatelessWidget {
  const OperatorHome({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<OperatorCubit>()..loadCompany(),
      child: const _OperatorHomeView(),
    );
  }
}

class _OperatorHomeView extends StatelessWidget {
  const _OperatorHomeView();

  @override
  Widget build(BuildContext context) {
    return AuthListener(
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Operator'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Sign out',
              onPressed: () => context.read<AuthCubit>().logout(),
            ),
          ],
        ),
        body: BlocBuilder<AuthCubit, AuthState>(
          builder: (context, authState) {
            final user = authState is AuthAuthenticated ? authState.user : null;
            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () async => context.read<OperatorCubit>().loadCompany(),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                children: [
                  // Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.secondary, Color(0xFF0A5A4E)],
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
                                'Welcome, ${user?.fullName ?? 'Operator'}',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                  letterSpacing: -0.3,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Manage your fleet, routes and trips',
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
                          child: const Icon(Icons.directions_bus_filled,
                              color: Colors.white, size: 26),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Company status
                  BlocBuilder<OperatorCubit, OperatorState>(
                    builder: (context, state) {
                      if (state is CompanyLoaded && state.company == null) {
                        return _CompanyStatusCard(
                          tone: _CompanyStatus.warning,
                          icon: Icons.add_business_outlined,
                          title: 'No company registered',
                          message:
                              'Register your bus company to start adding buses and publishing trips.',
                          actionLabel: 'Register Company',
                          onAction: () => Navigator.pushNamed(
                            context,
                            '/operator/register-company',
                          ).then((_) {
                            if (!context.mounted) return;
                            context.read<OperatorCubit>().loadCompany();
                          }),
                        );
                      }
                      if (state is CompanyLoaded && state.company != null) {
                        final isApproved = state.company['isApproved'] == true;
                        if (!isApproved) {
                          return const _CompanyStatusCard(
                            tone: _CompanyStatus.info,
                            icon: Icons.hourglass_top_rounded,
                            title: 'Pending admin approval',
                            message:
                                'Your company registration is being reviewed. You can add buses and routes now — they will go live once approved.',
                          );
                        }
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                  const SizedBox(height: 24),

                  SectionHeader(title: 'Management'),
                  _OperatorActionCard(
                    icon: Icons.directions_bus_outlined,
                    title: 'Fleet',
                    subtitle: 'Register buses and manage maintenance',
                    color: AppColors.primary,
                    onTap: () => Navigator.pushNamed(context, '/operator/buses'),
                  ),
                  const SizedBox(height: 12),
                  _OperatorActionCard(
                    icon: Icons.route_outlined,
                    title: 'Routes',
                    subtitle: 'Create and manage your routes',
                    color: AppColors.secondary,
                    onTap: () => Navigator.pushNamed(context, '/operator/routes'),
                  ),
                  const SizedBox(height: 12),
                  _OperatorActionCard(
                    icon: Icons.schedule_outlined,
                    title: 'Trip Schedules',
                    subtitle: 'Schedule trips and control boarding',
                    color: AppColors.driverColor,
                    onTap: () => Navigator.pushNamed(context, '/operator/trips'),
                  ),
                  const SizedBox(height: 24),

                  SectionHeader(title: 'Insights'),
                  _OperatorActionCard(
                    icon: Icons.bar_chart_rounded,
                    title: 'Revenue Dashboard',
                    subtitle: 'Revenue, commission and platform metrics',
                    color: AppColors.success,
                    onTap: () => Navigator.pushNamed(context, '/operator/analytics'),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

enum _CompanyStatus { warning, info }

class _CompanyStatusCard extends StatelessWidget {
  final _CompanyStatus tone;
  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _CompanyStatusCard({
    required this.tone,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      _CompanyStatus.warning => (AppColors.warningLight, AppColors.warning),
      _CompanyStatus.info => (AppColors.infoLight, AppColors.info),
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: fg.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: fg, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: fg,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.arrow_forward, size: 16),
                label: Text(actionLabel!),
                style: FilledButton.styleFrom(
                  backgroundColor: fg,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _OperatorActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _OperatorActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
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
                const Icon(Icons.chevron_right, color: AppColors.textHint),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
