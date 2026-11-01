import 'package:equatable/equatable.dart';

/// Live seat map for a trip, returned by GET /trips/:id/seats.
class SeatMap extends Equatable {
  final String tripId;
  final int busCapacity;
  final List<int> availableSeats;
  final List<int> takenSeats;

  const SeatMap({
    required this.tripId,
    required this.busCapacity,
    required this.availableSeats,
    required this.takenSeats,
  });

  factory SeatMap.fromJson(Map<String, dynamic> json) {
    return SeatMap(
      tripId: json['tripId'] as String,
      busCapacity: (json['busCapacity'] as num?)?.toInt() ?? 40,
      availableSeats: ((json['availableSeats'] as List<dynamic>?) ?? [])
          .map((e) => (e as num).toInt())
          .toList(),
      takenSeats: ((json['takenSeats'] as List<dynamic>?) ?? [])
          .map((e) => (e as num).toInt())
          .toList(),
    );
  }

  bool isAvailable(int seatNumber) => availableSeats.contains(seatNumber);

  @override
  List<Object?> get props => [tripId, busCapacity, availableSeats, takenSeats];
}
