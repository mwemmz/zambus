import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiErrorDetail } from '../errors/api-exception';

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
}

/**
 * Convert every thrown error into the documented error envelope.
 * Status codes follow docs/API_CONTRACT.md#errors.
 */
@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.normalise(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status} ${code}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorEnvelope = {
      success: false,
      error: { code, message, details },
    };

    response.status(status).json(body);
  }

  private normalise(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: ApiErrorDetail[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'object' && payload !== null && 'code' in payload) {
        const typed = payload as { code?: string; message?: string; details?: ApiErrorDetail[] };
        return {
          status,
          code: typed.code ?? this.defaultCode(status),
          message: typed.message ?? exception.message,
          details: typed.details ?? [],
        };
      }

      // Nest validation pipe and framework generated errors.
      const raw = payload as { message?: string | string[]; error?: string };
      const messages = Array.isArray(raw.message)
        ? raw.message
        : raw.message
          ? [raw.message]
          : [exception.message];

      return {
        status,
        code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : this.defaultCode(status),
        message:
          status === HttpStatus.BAD_REQUEST
            ? 'The request contains invalid or missing fields.'
            : messages[0],
        details: messages.map((issue) => ({ issue })),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.normalisePrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid fields.',
        details: [],
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      details: [],
    };
  }

  private normalisePrisma(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
    details: ApiErrorDetail[];
  } {
    const target = Array.isArray(error.meta?.target)
      ? (error.meta?.target as string[]).join(', ')
      : String(error.meta?.target ?? '');

    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'DUPLICATE_RESOURCE',
          message: 'A record with the same unique value already exists.',
          details: target ? [{ issue: `Duplicate value for: ${target}` }] : [],
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'INVALID_REFERENCE',
          message: 'A referenced record does not exist or cannot be modified.',
          details: [],
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'The requested record does not exist.',
          details: [],
        };
      case 'P2034':
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONCURRENT_MODIFICATION',
          message: 'The record was modified by another request. Please retry.',
          details: [],
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'DATABASE_ERROR',
          message: 'The database rejected the request.',
          details: [],
        };
    }
  }

  private defaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.GONE:
        return 'GONE';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
