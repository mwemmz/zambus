import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import 'seat_widget.dart';

class BusLayout extends StatelessWidget {
  final int totalSeats;
  final List<int> occupiedSeats;
  final int? selectedSeat;
  final ValueChanged<int>? onSeatTap;
  final int seatsPerRow;
  final int driverSeatNumber;

  const BusLayout({
    super.key,
    required this.totalSeats,
    this.occupiedSeats = const [],
    this.selectedSeat,
    this.onSeatTap,
    this.seatsPerRow = 4,
    this.driverSeatNumber = 0,
  });

  @override
  Widget build(BuildContext context) {
    final rows = (totalSeats / seatsPerRow).ceil();

    return Column(
      children: [
        // Bus front indicator
        Container(
          width: 120,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            border: Border.all(color: AppColors.border),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.directions_bus, size: 16, color: AppColors.textHint),
              SizedBox(width: 6),
              Text('Front', style: TextStyle(fontSize: 12, color: AppColors.textHint)),
            ],
          ),
        ),
        const SizedBox(height: 8),

        // Driver seat
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SeatWidget(
              number: driverSeatNumber,
              status: SeatStatus.driver,
              onTap: null,
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Passenger seats
        ...List.generate(rows, (rowIndex) {
          final startSeat = rowIndex * seatsPerRow + 1;

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Left seats (2)
                ...List.generate(seatsPerRow ~/ 2, (colIndex) {
                  final seatNum = startSeat + colIndex;
                  if (seatNum > totalSeats) return SizedBox(width: 44, height: 44);
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: SeatWidget(
                      number: seatNum,
                      status: _getSeatStatus(seatNum),
                      onTap: onSeatTap != null ? () => onSeatTap!(seatNum) : null,
                    ),
                  );
                }),

                // Aisle
                const SizedBox(width: 28),

                // Right seats (2)
                ...List.generate(seatsPerRow ~/ 2, (colIndex) {
                  final seatNum = startSeat + (seatsPerRow ~/ 2) + colIndex;
                  if (seatNum > totalSeats) return SizedBox(width: 44, height: 44);
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: SeatWidget(
                      number: seatNum,
                      status: _getSeatStatus(seatNum),
                      onTap: onSeatTap != null ? () => onSeatTap!(seatNum) : null,
                    ),
                  );
                }),
              ],
            ),
          );
        }),
      ],
    );
  }

  SeatStatus _getSeatStatus(int seatNumber) {
    if (seatNumber == driverSeatNumber) return SeatStatus.driver;
    if (seatNumber == selectedSeat) return SeatStatus.selected;
    if (occupiedSeats.contains(seatNumber)) return SeatStatus.occupied;
    return SeatStatus.available;
  }
}
