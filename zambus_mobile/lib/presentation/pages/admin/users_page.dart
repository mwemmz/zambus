import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../injection_container.dart';
import '../../cubit/admin/admin_cubit.dart';
import '../../cubit/admin/admin_state.dart';
import '../../widgets/common/loading_indicator.dart';
import '../../widgets/common/empty_state.dart';

class UsersPage extends StatelessWidget {
  const UsersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<AdminCubit>()..loadAllUsers(),
      child: const _UsersView(),
    );
  }
}

class _UsersView extends StatelessWidget {
  const _UsersView();

  static const _roleFilters = <String?>[
    null,
    'PASSENGER',
    'DRIVER',
    'OPERATOR',
    'ADMIN',
  ];

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AdminCubit, AdminState>(
      listener: (context, state) {
        if (state is UserRoleUpdated) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Role updated to ${Formatters.formatRole(state.role)}'),
              backgroundColor: AppColors.success,
            ),
          );
        } else if (state is AdminError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: const Text('User Management')),
          body: Column(
            children: [
              // Role filter chips
              Container(
                width: double.infinity,
                color: AppColors.surface,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: SizedBox(
                  height: 36,
                  child: BlocBuilder<AdminCubit, AdminState>(
                    builder: (context, state) {
                      final currentRole = state is AllUsersLoaded ? state.activeRoleFilter : null;
                      return ListView(
                        scrollDirection: Axis.horizontal,
                        children: _roleFilters.map((role) {
                          final selected = currentRole == role;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(role == null ? 'All' : Formatters.formatRole(role)),
                              selected: selected,
                              selectedColor: AppColors.primary,
                              labelStyle: TextStyle(
                                fontSize: 13,
                                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                                color: selected ? Colors.white : AppColors.textSecondary,
                              ),
                              showCheckmark: false,
                              onSelected: (_) =>
                                  context.read<AdminCubit>().loadAllUsers(role: role),
                            ),
                          );
                        }).toList(),
                      );
                    },
                  ),
                ),
              ),
              Expanded(
                child: BlocBuilder<AdminCubit, AdminState>(
                  builder: (context, state) {
                    if (state is AllUsersLoading) {
                      return const LoadingIndicator(message: 'Loading users...');
                    }
                    if (state is AllUsersLoaded) {
                      if (state.users.isEmpty) {
                        return const EmptyState(
                          icon: Icons.people_outline,
                          title: 'No users found',
                          subtitle: 'Try a different role filter',
                        );
                      }
                      return RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: () async =>
                            context.read<AdminCubit>().loadAllUsers(role: state.activeRoleFilter),
                        child: ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          itemCount: state.users.length,
                          itemBuilder: (context, index) {
                            final user = state.users[index];
                            return _UserCard(
                              name: user.fullName,
                              email: user.email,
                              phone: user.phoneNumber,
                              role: user.role,
                              onTap: () => _showRoleDialog(context, user.userId, user.role),
                            );
                          },
                        ),
                      );
                    }
                    return const SizedBox.shrink();
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showRoleDialog(BuildContext context, String userId, String currentRole) {
    final roles = ['PASSENGER', 'DRIVER', 'OPERATOR', 'ADMIN'];
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change User Role'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: roles.map((role) {
            return RadioListTile<String>(
              title: Text(Formatters.formatRole(role)),
              value: role,
              groupValue: currentRole,
              onChanged: (value) {
                if (value != null) {
                  context.read<AdminCubit>().updateUserRole(userId, value);
                  Navigator.pop(ctx);
                }
              },
            );
          }).toList(),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ],
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  final String name;
  final String email;
  final String phone;
  final String role;
  final VoidCallback onTap;

  const _UserCard({
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.onTap,
  });

  Color get _roleColor => switch (role) {
        'ADMIN' => AppColors.adminColor,
        'OPERATOR' => AppColors.operatorColor,
        'DRIVER' => AppColors.driverColor,
        _ => AppColors.passengerColor,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: _roleColor.withValues(alpha: 0.1),
          child: Text(
            name.isNotEmpty ? name[0].toUpperCase() : '?',
            style: TextStyle(
              color: _roleColor,
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
          ),
        ),
        title: Text(
          name,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text(
            email,
            style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: _roleColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            Formatters.formatRole(role),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: _roleColor,
            ),
          ),
        ),
      ),
    );
  }
}
