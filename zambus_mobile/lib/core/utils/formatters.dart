import 'package:intl/intl.dart';

class Formatters {
  static final DateFormat _dateFormat = DateFormat('yyyy-MM-dd');
  static final DateFormat _dateTimeFormat = DateFormat('yyyy-MM-dd HH:mm');
  static final DateFormat _displayDateFormat = DateFormat('MMM dd, yyyy');
  static final DateFormat _displayTimeFormat = DateFormat('HH:mm');
  static final DateFormat _displayDateTimeFormat = DateFormat('MMM dd, yyyy HH:mm');

  static String formatDate(DateTime date) {
    return _dateFormat.format(date);
  }

  static String formatDateTime(DateTime date) {
    return _dateTimeFormat.format(date);
  }

  static String formatDisplayDate(DateTime date) {
    return _displayDateFormat.format(date);
  }

  static String formatDisplayTime(DateTime date) {
    return _displayTimeFormat.format(date);
  }

  static String formatDisplayDateTime(DateTime date) {
    return _displayDateTimeFormat.format(date);
  }

  /// Human-friendly duration between two times, e.g. "5h 30m".
  static String tripDuration(DateTime departure, DateTime arrival) {
    final diff = arrival.difference(departure);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    final h = diff.inHours;
    final m = diff.inMinutes % 60;
    return m == 0 ? '${h}h' : '${h}h ${m}m';
  }

  static String formatCurrency(double amount, {String currency = 'K'}) {
    final formatter = NumberFormat.currency(
      symbol: currency,
      decimalDigits: 2,
    );
    return formatter.format(amount);
  }

  static String formatSeatsAvailable(int total, int booked) {
    final remaining = total - booked;
    if (remaining == 0) {
      return 'Sold Out';
    }
    return '$remaining seats';
  }

  static String formatBusCategory(String? category) {
    if (category == null) return 'Standard';
    return category;
  }

  static String formatBoardingStatus(String? status) {
    if (status == null) return 'Unknown';
    switch (status) {
      case 'NOT_BOARDED':
        return 'Not Boarded';
      case 'BOARDED':
        return 'Boarded';
      case 'DROPPED_OFF':
        return 'Dropped Off';
      default:
        return status;
    }
  }

  static String formatPaymentStatus(String? status) {
    if (status == null) return 'Unknown';
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'REFUNDED':
        return 'Refunded';
      default:
        return status;
    }
  }

  static String formatRole(String? role) {
    if (role == null) return 'Unknown';
    switch (role) {
      case 'PASSENGER':
        return 'Passenger';
      case 'DRIVER':
        return 'Driver';
      case 'OPERATOR':
        return 'Operator';
      case 'ADMIN':
        return 'Admin';
      default:
        return role;
    }
  }

  static String formatMaintenanceStatus(String? status) {
    if (status == null) return 'Unknown';
    switch (status) {
      case 'OPERATIONAL':
        return 'Operational';
      case 'MAINTENANCE':
        return 'In Maintenance';
      case 'OUT_OF_SERVICE':
        return 'Out of Service';
      default:
        return status;
    }
  }

  static String formatApprovalStatus(String? status) {
    if (status == null) return 'Unknown';
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  }

  static String formatTripStatus(String? status) {
    if (status == null) return 'Unknown';
    switch (status) {
      case 'SCHEDULED':
        return 'Scheduled';
      case 'BOARDING':
        return 'Boarding';
      case 'IN_TRANSIT':
        return 'In Transit';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }
}
