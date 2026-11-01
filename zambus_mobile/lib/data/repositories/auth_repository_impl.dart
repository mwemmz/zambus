import '../../domain/repositories/auth_repository.dart';
import '../../domain/entities/user.dart';
import '../datasources/api_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final ApiDatasource _datasource;

  AuthRepositoryImpl(this._datasource);

  @override
  Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String phoneNumber,
    required String password,
    String? role,
  }) async {
    return await _datasource.register(
      fullName: fullName,
      email: email,
      phoneNumber: phoneNumber,
      password: password,
      role: role,
    );
  }

  @override
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    return await _datasource.login(email: email, password: password);
  }

  @override
  Future<UserEntity> getMe() async {
    final user = await _datasource.getMe();
    return UserEntity(
      userId: user.userId,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    );
  }

  @override
  Future<UserEntity> updateProfile({String? fullName, String? phoneNumber}) async {
    final user = await _datasource.updateProfile(
      fullName: fullName,
      phoneNumber: phoneNumber,
    );
    return UserEntity(
      userId: user.userId,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    );
  }
}
