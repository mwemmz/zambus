import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof AppError) {
    errorResponse(res, err.statusCode, err.message);
    return;
  }

  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    errorResponse(res, 400, 'Invalid JSON');
    return;
  }

  errorResponse(res, 500, 'Internal server error');
}
