import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

/**
 * Raised by services/controllers when a request is well formed but violates a
 * business rule. Produces the standard error envelope documented in
 * docs/API_CONTRACT.md.
 */
export class ApiException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super({ code, message, details }, status);
  }

  static unauthorized(message = 'Authentication is required.'): ApiException {
    return new ApiException('UNAUTHENTICATED', message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = 'You do not have permission to perform this action.'): ApiException {
    return new ApiException('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }

  static notFound(resource = 'Resource', message?: string): ApiException {
    return new ApiException(
      'NOT_FOUND',
      message ?? `${resource} was not found.`,
      HttpStatus.NOT_FOUND,
    );
  }

  static conflict(code: string, message: string, details: ApiErrorDetail[] = []): ApiException {
    return new ApiException(code, message, HttpStatus.CONFLICT, details);
  }

  static gone(code: string, message: string): ApiException {
    return new ApiException(code, message, HttpStatus.GONE);
  }

  static unprocessable(code: string, message: string, details: ApiErrorDetail[] = []): ApiException {
    return new ApiException(code, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}
