import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../injection_container.dart';
import '../../cubit/admin/admin_cubit.dart';
import '../../cubit/admin/admin_state.dart';
import '../../widgets/common/loading_indicator.dart';
import '../../widgets/common/empty_state.dart';

class CompaniesPage extends StatelessWidget {
  const CompaniesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<AdminCubit>()..loadPendingCompanies(),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Company Approvals')),
        body: BlocConsumer<AdminCubit, AdminState>(
          listener: (context, state) {
            if (state is CompanyApproved) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Company approved'), backgroundColor: AppColors.success),
              );
            }
          },
          builder: (context, state) {
            if (state is PendingCompaniesLoading) {
              return const LoadingIndicator(message: 'Loading companies...');
            }
            if (state is PendingCompaniesLoaded) {
              if (state.companies.isEmpty) {
                return const EmptyState(
                  icon: Icons.business_center,
                  title: 'No pending approvals',
                  subtitle: 'All company registrations have been reviewed',
                );
              }
              return RefreshIndicator(
                onRefresh: () async => context.read<AdminCubit>().loadPendingCompanies(),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: state.companies.length,
                  itemBuilder: (context, index) {
                    final company = state.companies[index] as Map<String, dynamic>;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              company['companyName'] ?? 'Unknown Company',
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            if (company['contactEmail'] != null)
                              _InfoChip(icon: Icons.email, text: company['contactEmail']),
                            if (company['contactPhone'] != null)
                              _InfoChip(icon: Icons.phone, text: company['contactPhone']),
                            if (company['registrationNumber'] != null)
                              _InfoChip(icon: Icons.badge, text: company['registrationNumber']),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () => context.read<AdminCubit>().rejectCompany(company['companyId']),
                                    style: OutlinedButton.styleFrom(foregroundColor: AppColors.error),
                                    child: const Text('Reject'),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: () => context.read<AdminCubit>().approveCompany(company['companyId']),
                                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.success, foregroundColor: Colors.white),
                                    child: const Text('Approve'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            }
            if (state is AdminError) {
              return Center(child: Text(state.message));
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        ],
      ),
    );
  }
}
