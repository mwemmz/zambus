import 'package:dio/dio.dart';

/// Converts exceptions (Dio/network errors, API error bodies, unexpected
/// crashes) into short, actionable messages that can be shown to the user.
class ErrorMessages {
  ErrorMessages._();

  /// Network problems (no internet, server down, timeouts).
  static const String _serverUnreachable =
      'Cannot reach the ZamBus servers right now. Please try again later.';

  /// Returns a user-friendly message for [error].
  static String from(Object error) {
    if (error is DioException) {
      return _fromDio(error);
    }
    return fallback;
  }

  /// Fallback for errors we cannot classify (parse errors, unknown bugs).
  static const String fallback =
      'Something went wrong. Please try again.';

  static String _fromDio(DioException e) {
    // Prefer the API's own message when the backend sent one we can show.
    final apiMessage = _apiMessage(e.response?.data);
    if (apiMessage != null && apiMessage.isNotEmpty) {
      return apiMessage;
    }

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return 'The request took too long. Check your network and try again.';
      case DioExceptionType.connectionError:
        return _serverUnreachable;
      case DioExceptionType.badCertificate:
        return _serverUnreachable;
      case DioExceptionType.cancel:
        return 'The request was cancelled.';
      case DioExceptionType.badResponse:
        return _statusMessage(e.response?.statusCode);
      default:
        return _serverUnreachable;
    }
  }

  /// Maps HTTP status codes to friendly messages.
  static String _statusMessage(int? statusCode) {
    switch (statusCode) {
      case 400:
        return 'The request was invalid. Please check your details and try again.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to do that.';
      case 404:
        return 'We could not find what you were looking for.';
      case 409:
        return 'That action conflicts with an existing item. Please refresh and try again.';
      case 422:
        return 'Some of the details you entered are invalid. Please review and try again.';
      case 429:
        return 'Too many attempts. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return _serverUnreachable;
      default:
        return fallback;
    }
  }

  /// Extracts the human-readable message from an API error body, if any.
  /// Handles both `{"message": "..."}` and `{"error": "..."}` shapes and
  /// defensively skips non-string values.
  static String? _apiMessage(Object? data) {
    if (data is! Map) return null;
    final message = data['message'] ?? data['error'];
    if (message is String && message.trim().isNotEmpty) {
      return message.trim();
    }
    return null;
  }
}
