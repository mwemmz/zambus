import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

/**
 * Wraps successful responses in the documented envelope.
 * Controllers return plain data; pagination metadata lives inside `data`.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data: data === undefined ? (null as unknown as T) : data,
      })),
    );
  }
}
