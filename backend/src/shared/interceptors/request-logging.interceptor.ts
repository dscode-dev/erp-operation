import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { AppLoggerService } from '../../infra/logger/app-logger.service';
import { MetricsService } from '../../modules/health/metrics.service';
import type { RequestWithId } from '../types/request-with-id.type';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    let exceptionStatus: number | undefined;

    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          exceptionStatus = error instanceof HttpException ? error.getStatus() : 500;
        },
      }),
      finalize(() => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const statusCode = exceptionStatus ?? response.statusCode;
        this.metrics.recordHttpRequest({
          method: request.method,
          path: request.originalUrl,
          statusCode,
          durationMs,
        });
        this.logger.info('HTTP request completed', {
          event: 'http_request',
          requestId: request.requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode,
          durationMs: Number(durationMs.toFixed(3)),
          userAgent: request.get('user-agent') ?? null,
          ip: request.ip,
        });
      }),
    );
  }
}
