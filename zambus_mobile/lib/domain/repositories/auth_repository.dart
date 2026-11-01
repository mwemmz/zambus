import '../entities/user.dart';

abstract class AuthRepository {
  Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String phoneNumber,
    required String password,
    String? role,
  });

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  });

  Future<UserEntity> getMe();

  Future<UserEntity> updateProfile({String? fullName, String? phoneNumber});
}
