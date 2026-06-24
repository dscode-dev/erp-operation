import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppLoggerService } from '../../infra/logger/app-logger.service';
import { ERROR_CODES } from '../constants/error-codes.constants';
import type { ApiErrorResponse } from '../types/api-response.types';
import type { RequestWithId } from '../types/request-with-id.type';

interface NormalizedError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const normalized = this.normalize(exception, status);

    this.logger.error('Request failed', {
      event: 'exception',
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: status,
      errorCode: normalized.code,
      ...(exception instanceof Error && exception.stack ? { stack: exception.stack } : {}),
    });

    const payload: ApiErrorResponse = {
      success: false,
      error: normalized,
    };

    response.status(status).json(payload);
  }

  private normalize(exception: unknown, status: number): NormalizedError {
    if (!(exception instanceof HttpException)) {
      return {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        details: {},
      };
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return {
        code: this.codeForStatus(status),
        message: response,
        details: {},
      };
    }

    const body = response as Record<string, unknown>;
    const rawMessage = body.message;
    const validationMessages = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === 'string')
      : [];

    const details =
      body.details && typeof body.details === 'object' && !Array.isArray(body.details)
        ? (body.details as Record<string, unknown>)
        : validationMessages.length > 0
          ? { violations: validationMessages }
          : {};

    return {
      code:
        typeof body.code === 'string'
          ? body.code
          : validationMessages.length > 0
            ? ERROR_CODES.VALIDATION_ERROR
            : this.codeForStatus(status),
      message:
        validationMessages.length > 0
          ? 'Request validation failed'
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception.message,
      details,
    };
  }

  private codeForStatus(status: number): string {
    const codes: Partial<Record<number, string>> = {
      [HttpStatus.BAD_REQUEST]: ERROR_CODES.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
      [HttpStatus.PAYLOAD_TOO_LARGE]: ERROR_CODES.UPLOAD_FILE_TOO_LARGE,
      [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    };
    return codes[status] ?? `HTTP_${status}`;
  }
}
