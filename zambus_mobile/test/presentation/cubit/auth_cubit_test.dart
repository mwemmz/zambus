import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zambus_mobile/data/datasources/api_datasource.dart';
import 'package:zambus_mobile/core/network/api_client.dart';
import 'package:zambus_mobile/data/models/user_model.dart';
import 'package:zambus_mobile/presentation/cubit/auth/auth_cubit.dart';
import 'package:zambus_mobile/presentation/cubit/auth/auth_state.dart';

class MockApiDatasource extends Mock implements ApiDatasource {}
class MockApiClient extends Mock implements ApiClient {}

void main() {
  late AuthCubit authCubit;
  late MockApiDatasource mockDatasource;
  late MockApiClient mockApiClient;

  setUp(() {
    mockDatasource = MockApiDatasource();
    mockApiClient = MockApiClient();
    authCubit = AuthCubit(mockDatasource, mockApiClient);
  });

  tearDown(() {
    authCubit.close();
  });

  group('AuthCubit', () {
    test('initial state is AuthInitial', () {
      expect(authCubit.state, isA<AuthInitial>());
    });

    group('checkAuth', () {
      blocTest<AuthCubit, AuthState>(
        'emits AuthLoading then AuthUnauthenticated when getMe throws',
        build: () {
          when(() => mockApiClient.get(any())).thenThrow(Exception('No token'));
          when(() => mockApiClient.clearToken()).thenAnswer((_) async {});
          return authCubit;
        },
        act: (cubit) => cubit.checkAuth(),
        expect: () => [isA<AuthLoading>(), isA<AuthUnauthenticated>()],
      );
    });

    group('login', () {
      blocTest<AuthCubit, AuthState>(
        'emits AuthLoading then AuthAuthenticated on successful login',
        build: () {
          when(() => mockDatasource.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => {
                'user': {
                  'userId': 'test-123',
                  'fullName': 'Test User',
                  'email': 'test@test.com',
                  'phoneNumber': '+260977000000',
                  'role': 'PASSENGER',
                  'isActive': true,
                },
                'token': 'test-token-123',
              });
          when(() => mockApiClient.setToken(any())).thenAnswer((_) async {});
          return authCubit;
        },
        act: (cubit) => cubit.login(email: 'test@test.com', password: 'password'),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthAuthenticated>(),
        ],
      );

      blocTest<AuthCubit, AuthState>(
        'emits AuthLoading then AuthError on failed login',
        build: () {
          when(() => mockDatasource.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenThrow(Exception('Invalid credentials'));
          return authCubit;
        },
        act: (cubit) => cubit.login(email: 'test@test.com', password: 'wrong'),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthError>(),
        ],
      );
    });

    group('register', () {
      blocTest<AuthCubit, AuthState>(
        'emits AuthLoading then AuthAuthenticated on successful registration',
        build: () {
          when(() => mockDatasource.register(
                fullName: any(named: 'fullName'),
                email: any(named: 'email'),
                phoneNumber: any(named: 'phoneNumber'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => {
                'user': {
                  'userId': 'new-123',
                  'fullName': 'New User',
                  'email': 'new@test.com',
                  'phoneNumber': '+260977000001',
                  'role': 'PASSENGER',
                  'isActive': true,
                },
                'token': 'new-token-123',
              });
          when(() => mockApiClient.setToken(any())).thenAnswer((_) async {});
          return authCubit;
        },
        act: (cubit) => cubit.register(
          fullName: 'New User',
          email: 'new@test.com',
          phoneNumber: '+260977000001',
          password: 'password123',
        ),
        expect: () => [
          isA<AuthLoading>(),
          isA<AuthAuthenticated>(),
        ],
      );
    });

    group('logout', () {
      blocTest<AuthCubit, AuthState>(
        'emits AuthUnauthenticated on logout',
        build: () {
          when(() => mockApiClient.clearToken()).thenAnswer((_) async {});
          return authCubit;
        },
        act: (cubit) => cubit.logout(),
        expect: () => [isA<AuthUnauthenticated>()],
      );
    });
  });
}
