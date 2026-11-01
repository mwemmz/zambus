import 'package:equatable/equatable.dart';
import '../../../data/models/models.dart';

abstract class PassengerState extends Equatable {
  const PassengerState();
  
  @override
  List<Object?> get props => [];
}

class PassengerInitial extends PassengerState {}

class TripsLoading extends PassengerState {}

class TripsLoaded extends PassengerState {
  final List<Trip> trips;
  final int total;
  final int page;
  final int limit;
  final String? origin;
  final String? destination;
  final String? travelDate;

  const TripsLoaded({
    required this.trips,
    required this.total,
    required this.page,
    required this.limit,
    this.origin,
    this.destination,
    this.travelDate,
  });

  @override
  List<Object?> get props => [trips, total, page, limit, origin, destination, travelDate];
}

class TripDetailsLoading extends PassengerState {}

class TripDetailsLoaded extends PassengerState {
  final Trip trip;

  const TripDetailsLoaded(this.trip);

  @override
  List<Object?> get props => [trip];
}

class SeatSelectionLoading extends PassengerState {}

class SeatSelectionLoaded extends PassengerState {
  final Trip trip;
  final List<int> availableSeats;
  final int busCapacity;
  final int? selectedSeat;

  const SeatSelectionLoaded({
    required this.trip,
    required this.availableSeats,
    this.busCapacity = 40,
    this.selectedSeat,
  });

  /// All seats in the capacity range that are not available.
  List<int> get takenSeats => [
        for (var i = 1; i <= busCapacity; i++)
          if (!availableSeats.contains(i)) i
      ];

  @override
  List<Object?> get props => [trip, availableSeats, busCapacity, selectedSeat];
}

class BookingCreating extends PassengerState {}

class BookingCreated extends PassengerState {
  final Booking booking;

  const BookingCreated(this.booking);

  @override
  List<Object?> get props => [booking];
}

class BookingConfirming extends PassengerState {}

class BookingConfirmed extends PassengerState {
  final Booking booking;

  const BookingConfirmed(this.booking);

  @override
  List<Object?> get props => [booking];
}

class MyBookingsLoading extends PassengerState {}

class BookingDetailsLoading extends PassengerState {}

class BookingDetailsLoaded extends PassengerState {
  final Booking booking;
  final String? passengerName;

  const BookingDetailsLoaded(this.booking, {this.passengerName});

  @override
  List<Object?> get props => [booking, passengerName];
}

class MyBookingsLoaded extends PassengerState {
  final List<Booking> bookings;

  const MyBookingsLoaded(this.bookings);

  @override
  List<Object?> get props => [bookings];
}

class PassengerError extends PassengerState {
  final String message;

  const PassengerError(this.message);

  @override
  List<Object?> get props => [message];
}
