import { Request, Response, NextFunction } from 'express';

export function successResponse(
  res: Response,
  statusCode: number,
  data: unknown,
  message?: string
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown
): void {
  res.status(statusCode).json({
    success: false,
    message,
    errors: errors || undefined,
  });
}

export function notFoundResponse(res: Response, resource: string): void {
  errorResponse(res, 404, `${resource} not found`);
}

export function unauthorizedResponse(res: Response, message = 'Unauthorized'): void {
  errorResponse(res, 401, message);
}

export function forbiddenResponse(res: Response, message = 'Forbidden'): void {
  errorResponse(res, 403, message);
}
