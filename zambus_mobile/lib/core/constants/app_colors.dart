import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary palette
  static const Color primary = Color(0xFF1A56DB);
  static const Color primaryLight = Color(0xFF6B96F2);
  static const Color primaryDark = Color(0xFF123B96);
  static const Color primarySoft = Color(0xFFEBF0FE);
  static const Color secondary = Color(0xFF0E7C6B);
  static const Color secondaryLight = Color(0xFF5FBDAF);

  // Backgrounds
  static const Color background = Color(0xFFF6F8FB);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF2F4F7);

  // Text
  static const Color textPrimary = Color(0xFF101828);
  static const Color textSecondary = Color(0xFF667085);
  static const Color textHint = Color(0xFF98A2B3);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // Borders
  static const Color border = Color(0xFFEAECF0);
  static const Color borderLight = Color(0xFFF2F4F7);

  // Status
  static const Color success = Color(0xFF16A34A);
  static const Color successLight = Color(0xFFE8F7EE);
  static const Color error = Color(0xFFDC2626);
  static const Color errorLight = Color(0xFFFDECEC);
  static const Color warning = Color(0xFFD97706);
  static const Color warningLight = Color(0xFFFEF4E6);
  static const Color info = Color(0xFF1A56DB);
  static const Color infoLight = Color(0xFFEBF0FE);
  static const Color neutral = Color(0xFF667085);
  static const Color neutralLight = Color(0xFFF2F4F7);

  // Seat colors
  static const Color seatAvailable = Color(0xFF16A34A);
  static const Color seatOccupied = Color(0xFFDC2626);
  static const Color seatHeld = Color(0xFFD97706);
  static const Color seatSelected = Color(0xFF1A56DB);

  // Role colors
  static const Color passengerColor = Color(0xFF1A56DB);
  static const Color driverColor = Color(0xFF7C3AED);
  static const Color operatorColor = Color(0xFF0E7C6B);
  static const Color adminColor = Color(0xFFB42318);

  // Shadows
  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: const Color(0xFF101828).withValues(alpha: 0.06),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: const Color(0xFF101828).withValues(alpha: 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];
}
