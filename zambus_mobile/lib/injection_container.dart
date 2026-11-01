import 'package:get_it/get_it.dart';
import 'core/network/api_client.dart';
import 'data/datasources/api_datasource.dart';
import 'presentation/cubit/auth/auth_cubit.dart';
import 'presentation/cubit/passenger/passenger_cubit.dart';
import 'presentation/cubit/driver/driver_cubit.dart';
import 'presentation/cubit/operator/operator_cubit.dart';
import 'presentation/cubit/admin/admin_cubit.dart';

final getIt = GetIt.instance;

void configureDependencies() {
  getIt.registerLazySingleton<ApiClient>(() => ApiClient());
  getIt.registerLazySingleton<ApiDatasource>(
    () => ApiDatasource(getIt<ApiClient>()),
  );
  getIt.registerFactory<AuthCubit>(
    () => AuthCubit(getIt<ApiDatasource>(), getIt<ApiClient>()),
  );
  getIt.registerFactory<PassengerCubit>(
    () => PassengerCubit(getIt<ApiDatasource>()),
  );
  getIt.registerFactory<DriverCubit>(
    () => DriverCubit(getIt<ApiDatasource>()),
  );
  getIt.registerFactory<OperatorCubit>(
    () => OperatorCubit(getIt<ApiDatasource>()),
  );
  getIt.registerFactory<AdminCubit>(
    () => AdminCubit(getIt<ApiDatasource>()),
  );
}
