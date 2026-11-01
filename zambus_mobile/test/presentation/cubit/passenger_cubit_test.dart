import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zambus_mobile/data/datasources/api_datasource.dart';
import 'package:zambus_mobile/data/models/trip_model.dart';
import 'package:zambus_mobile/data/models/route_model.dart';
import 'package:zambus_mobile/data/models/booking_model.dart';
import 'package:zambus_mobile/data/models/seat_map_model.dart';
import 'package:zambus_mobile/presentation/cubit/passenger/passenger_cubit.dart';
import 'package:zambus_mobile/presentation/cubit/passenger/passenger_state.dart';

class MockApiDatasource extends Mock implements ApiDatasource {}

void main() {
  late PassengerCubit passengerCubit;
  late MockApiDatasource mockDatasource;

  setUp(() {
    mockDatasource = MockApiDatasource();
    passengerCubit = PassengerCubit(mockDatasource);
  });

  tearDown(() {
    passengerCubit.close();
  });

  group('PassengerCubit', () {
    test('initial state is PassengerInitial', () {
      expect(passengerCubit.state, isA<PassengerInitial>());
    });

    group('searchTrips', () {
      blocTest<PassengerCubit, PassengerState>(
        'emits TripsLoading then TripsLoaded on success',
        build: () {
          when(() => mockDatasource.searchTrips(
                origin: any(named: 'origin'),
                destination: any(named: 'destination'),
                travelDate: any(named: 'travelDate'),
                filter: any(named: 'filter'),
                page: any(named: 'page'),
                limit: any(named: 'limit'),
              )).thenAnswer((_) async => [
                Trip(
                  tripId: 'trip-1',
                  departureTime: DateTime.now().add(const Duration(hours: 24)),
                  estimatedArrival: DateTime.now().add(const Duration(hours: 30)),
                  fareAmount: 150.0,
                  status: 'SCHEDULED',
                  route: Route(
                    routeId: 'route-1',
                    companyId: 'company-1',
                    routeName: 'Lusaka - Livingstone',
                    origin: 'Lusaka',
                    destination: 'Livingstone',
                  ),
                ),
              ]);
          return passengerCubit;
        },
        act: (cubit) => cubit.searchTrips(
          origin: 'Lusaka',
          destination: 'Livingstone',
        ),
        expect: () => [
          isA<TripsLoading>(),
          isA<TripsLoaded>(),
        ],
      );

      blocTest<PassengerCubit, PassengerState>(
        'emits TripsLoading then PassengerError on failure',
        build: () {
          when(() => mockDatasource.searchTrips(
                origin: any(named: 'origin'),
                destination: any(named: 'destination'),
                travelDate: any(named: 'travelDate'),
                filter: any(named: 'filter'),
                page: any(named: 'page'),
                limit: any(named: 'limit'),
              )).thenThrow(Exception('Network error'));
          return passengerCubit;
        },
        act: (cubit) => cubit.searchTrips(origin: 'Lusaka'),
        expect: () => [
          isA<TripsLoading>(),
          isA<PassengerError>(),
        ],
      );
    });

    group('getTripDetails', () {
      blocTest<PassengerCubit, PassengerState>(
        'emits TripDetailsLoading then TripDetailsLoaded',
        build: () {
          when(() => mockDatasource.getTripById(any())).thenAnswer(
            (_) async => Trip(
              tripId: 'trip-1',
              departureTime: DateTime.now().add(const Duration(hours: 24)),
              estimatedArrival: DateTime.now().add(const Duration(hours: 30)),
              fareAmount: 150.0,
              status: 'SCHEDULED',
            ),
          );
          return passengerCubit;
        },
        act: (cubit) => cubit.getTripDetails('trip-1'),
        expect: () => [
          isA<TripDetailsLoading>(),
          isA<TripDetailsLoaded>(),
        ],
      );
    });

    group('getMyBookings', () {
      blocTest<PassengerCubit, PassengerState>(
        'emits MyBookingsLoading then MyBookingsLoaded',
        build: () {
          when(() => mockDatasource.getMyBookings())
              .thenAnswer((_) async => []);
          return passengerCubit;
        },
        act: (cubit) => cubit.getMyBookings(),
        expect: () => [
          isA<MyBookingsLoading>(),
          isA<MyBookingsLoaded>(),
        ],
      );
    });

    group('getBookingDetails', () {
      blocTest<PassengerCubit, PassengerState>(
        'emits BookingDetailsLoading then BookingDetailsLoaded with passenger name',
        build: () {
          when(() => mockDatasource.getBookingById(any()))
              .thenAnswer((_) async => Booking(
                    bookingId: 'booking-1',
                    tripId: 'trip-1',
                    seatNumber: 5,
                    qrCodeData: 'test-qr-data',
                    passengerName: 'Jane Banda',
                  ));
          return passengerCubit;
        },
        act: (cubit) => cubit.getBookingDetails('booking-1'),
        expect: () => [
          isA<BookingDetailsLoading>(),
          isA<BookingDetailsLoaded>()
              .having((s) => s.passengerName, 'passengerName', 'Jane Banda'),
        ],
      );
    });

    group('cancelBooking', () {
      blocTest<PassengerCubit, PassengerState>(
        'refetches booking details so the ticket screen reflects the cancellation',
        build: () {
          when(() => mockDatasource.getBookingById(any())).thenAnswer(
            (_) async => Booking(
              bookingId: 'booking-1',
              tripId: 'trip-1',
              seatNumber: 5,
              qrCodeData: 'test-qr-data',
              paymentStatus: 'REFUNDED',
            ),
          );
          when(() => mockDatasource.cancelBooking(any())).thenAnswer(
            (_) async => Booking(
              bookingId: 'booking-1',
              tripId: 'trip-1',
              seatNumber: 5,
              qrCodeData: 'test-qr-data',
              paymentStatus: 'REFUNDED',
            ),
          );
          return passengerCubit;
        },
        act: (cubit) async {
          // Ticket screen loads the booking first, then cancels it.
          await cubit.getBookingDetails('booking-1');
          await cubit.cancelBooking('booking-1');
        },
        expect: () => [
          isA<BookingDetailsLoading>(),
          isA<BookingDetailsLoaded>(),
          isA<BookingDetailsLoading>(),
          isA<BookingDetailsLoaded>(),
        ],
      );
    });

    group('loadSeatMap', () {
      blocTest<PassengerCubit, PassengerState>(
        'emits SeatSelectionLoading then SeatSelectionLoaded with taken seats',
        build: () {
          when(() => mockDatasource.getTripById(any())).thenAnswer(
            (_) async => Trip(
              tripId: 'trip-1',
              departureTime: DateTime.now().add(const Duration(hours: 24)),
              estimatedArrival: DateTime.now().add(const Duration(hours: 30)),
              fareAmount: 150.0,
              status: 'SCHEDULED',
            ),
          );
          when(() => mockDatasource.getTripSeats(any())).thenAnswer(
            (_) async => SeatMap(
              tripId: 'trip-1',
              busCapacity: 8,
              availableSeats: [1, 2, 3],
              takenSeats: [4, 5, 6, 7, 8],
            ),
          );
          return passengerCubit;
        },
        act: (cubit) => cubit.loadSeatMap('trip-1'),
        expect: () => [
          isA<SeatSelectionLoading>(),
          isA<SeatSelectionLoaded>()
              .having((s) => s.takenSeats, 'takenSeats', [4, 5, 6, 7, 8]),
        ],
      );
    });

    group('bookAndPay', () {
      blocTest<PassengerCubit, PassengerState>(
        'emits BookingCreating then BookingConfirmed on success',
        build: () {
          when(() => mockDatasource.createAndConfirmBooking(
                tripId: any(named: 'tripId'),
                seatNumber: any(named: 'seatNumber'),
              )).thenAnswer(
            (_) async => Booking(
              bookingId: 'booking-1',
              tripId: 'trip-1',
              passengerId: 'passenger-1',
              seatNumber: 5,
              qrCodeData: 'test-qr-data',
              paymentStatus: 'CONFIRMED',
              boardingStatus: 'NOT_BOARDED',
            ),
          );
          return passengerCubit;
        },
        act: (cubit) => cubit.bookAndPay('trip-1', 5),
        expect: () => [
          isA<BookingCreating>(),
          isA<BookingConfirmed>(),
        ],
      );

      blocTest<PassengerCubit, PassengerState>(
        'emits BookingCreating then PassengerError on failure',
        build: () {
          when(() => mockDatasource.createAndConfirmBooking(
                tripId: any(named: 'tripId'),
                seatNumber: any(named: 'seatNumber'),
              )).thenThrow(Exception('Seat already booked'));
          return passengerCubit;
        },
        act: (cubit) => cubit.bookAndPay('trip-1', 5),
        expect: () => [
          isA<BookingCreating>(),
          isA<PassengerError>(),
        ],
      );
    });
  });
}
