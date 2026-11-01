import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

enum SeatStatus { available, occupied, held, selected, driver }

class SeatWidget extends StatelessWidget {
  final int number;
  final SeatStatus status;
  final VoidCallback? onTap;
  final double size;

  const SeatWidget({
    super.key,
    required this.number,
    required this.status,
    this.onTap,
    this.size = 44,
  });

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      SeatStatus.available => AppColors.seatAvailable,
      SeatStatus.occupied => AppColors.seatOccupied,
      SeatStatus.held => AppColors.seatHeld,
      SeatStatus.selected => AppColors.seatSelected,
      SeatStatus.driver => AppColors.textHint,
    };

    final canTap = status == SeatStatus.available || status == SeatStatus.selected;

    return GestureDetector(
      onTap: canTap ? onTap : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color.withValues(alpha: status == SeatStatus.occupied ? 0.3 : 0.15),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: color,
            width: status == SeatStatus.selected ? 2.5 : 1.5,
          ),
        ),
        child: Center(
          child: status == SeatStatus.driver
              ? Icon(Icons.person, size: 18, color: color)
              : Text(
                  '$number',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
        ),
      ),
    );
  }
}
