import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String userId;
  final String fullName;
  final String email;
  final String phoneNumber;
  final String role;
  final bool isActive;
  final DateTime? createdAt;

  const User({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.phoneNumber,
    required this.role,
    this.isActive = true,
    this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: json['userId'] as String,
      fullName: json['fullName'] as String? ?? 'User',
      email: json['email'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      role: json['role'] as String? ?? 'PASSENGER',
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'fullName': fullName,
      'email': email,
      'phoneNumber': phoneNumber,
      'role': role,
      'isActive': isActive,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  bool get isPassenger => role == 'PASSENGER';
  bool get isDriver => role == 'DRIVER';
  bool get isOperator => role == 'OPERATOR';
  bool get isAdmin => role == 'ADMIN';

  @override
  List<Object?> get props => [userId, fullName, email, phoneNumber, role, isActive];
}
