import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RAW_RESPONSE_METADATA_KEY } from '../decorators/raw-response.decorator';
import type { ApiSuccessResponse } from '../types/api-response.types';

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, T | ApiSuccessResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T | ApiSuccessResponse<T>> {
    const rawResponse = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (rawResponse) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
