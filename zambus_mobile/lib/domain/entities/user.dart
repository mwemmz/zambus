class UserEntity {
  final String userId;
  final String fullName;
  final String phoneNumber;
  final String email;
  final String role;
  final bool isActive;
  final DateTime? createdAt;

  const UserEntity({
    required this.userId,
    required this.fullName,
    required this.phoneNumber,
    required this.email,
    required this.role,
    this.isActive = true,
    this.createdAt,
  });

  bool get isPassenger => role == 'PASSENGER';
  bool get isDriver => role == 'DRIVER';
  bool get isOperator => role == 'OPERATOR';
  bool get isAdmin => role == 'ADMIN';
}
