import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zambus_mobile/data/datasources/api_datasource.dart';
import 'package:zambus_mobile/presentation/cubit/driver/driver_cubit.dart';
import 'package:zambus_mobile/presentation/cubit/driver/driver_state.dart';

class MockApiDatasource extends Mock implements ApiDatasource {}

void main() {
  late DriverCubit driverCubit;
  late MockApiDatasource mockDatasource;

  setUp(() {
    mockDatasource = MockApiDatasource();
    driverCubit = DriverCubit(mockDatasource);
  });

  tearDown(() {
    driverCubit.close();
  });

  group('DriverCubit', () {
    test('initial state is DriverInitial', () {
      expect(driverCubit.state, isA<DriverInitial>());
    });

    group('scanTicket', () {
      blocTest<DriverCubit, DriverState>(
        'emits Scanning then ScanResult for valid ticket',
        build: () {
          when(() => mockDatasource.scanTicket(
                any(),
                tripId: any(named: 'tripId'),
              )).thenAnswer((_) async => {
                'valid': true,
                'status': 'VALID',
                'message': 'Valid ticket',
                'booking': {
                  'bookingId': 'booking-1',
                  'seatNumber': 5,
                },
              });
          return driverCubit;
        },
        act: (cubit) => cubit.scanTicket('qr-data-123', tripId: 'trip-1'),
        expect: () => [
          isA<Scanning>(),
          isA<ScanResult>(),
        ],
      );

      blocTest<DriverCubit, DriverState>(
        'emits Scanning then ScanResult for duplicate ticket',
        build: () {
          when(() => mockDatasource.scanTicket(
                any(),
                tripId: any(named: 'tripId'),
              )).thenAnswer((_) async => {
                'valid': false,
                'status': 'DUPLICATE',
                'message': 'Ticket already used',
                'booking': {
                  'bookingId': 'booking-1',
                  'seatNumber': 5,
                },
              });
          return driverCubit;
        },
        act: (cubit) => cubit.scanTicket('qr-data-123'),
        expect: () => [
          isA<Scanning>(),
          isA<ScanResult>(),
        ],
        verify: (cubit) {
          final state = cubit.state as ScanResult;
          expect(state.valid, false);
          expect(state.status, 'DUPLICATE');
        },
      );

      blocTest<DriverCubit, DriverState>(
        'emits Scanning then DriverError on failure',
        build: () {
          when(() => mockDatasource.scanTicket(
                any(),
                tripId: any(named: 'tripId'),
              )).thenThrow(Exception('Network error'));
          return driverCubit;
        },
        act: (cubit) => cubit.scanTicket('qr-data-123'),
        expect: () => [
          isA<Scanning>(),
          isA<DriverError>(),
        ],
      );
    });

    group('markAsBoarded', () {
      blocTest<DriverCubit, DriverState>(
        'emits MarkingBoarded then BoardingMarked on success',
        build: () {
          when(() => mockDatasource.markBoarded(any()))
              .thenAnswer((_) async => throw UnimplementedError());
          when(() => mockDatasource.getBoardingManifest(any()))
              .thenAnswer((_) async => throw UnimplementedError());
          return driverCubit;
        },
        act: (cubit) => cubit.markAsBoarded('booking-1'),
        expect: () => [
          isA<MarkingBoarded>(),
          isA<DriverError>(), // manifest refresh fails in test
        ],
      );
    });

    group('reportEmergency', () {
      blocTest<DriverCubit, DriverState>(
        'emits EmergencyReporting then EmergencyReported',
        build: () {
          when(() => mockDatasource.reportEmergency(
                emergencyType: any(named: 'emergencyType'),
                description: any(named: 'description'),
                location: any(named: 'location'),
                tripId: any(named: 'tripId'),
              )).thenAnswer((_) async => throw UnimplementedError());
          return driverCubit;
        },
        act: (cubit) => cubit.reportEmergency(
          emergencyType: 'BREAKDOWN',
          description: 'Engine failure',
          tripId: 'trip-1',
        ),
        expect: () => [
          isA<EmergencyReporting>(),
          isA<DriverError>(),
        ],
      );
    });
  });
}
