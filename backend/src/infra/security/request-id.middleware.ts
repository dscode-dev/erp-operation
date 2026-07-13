import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { REQUEST_ID_HEADER } from '../../shared/constants/api.constants';
import type { RequestWithId } from '../../shared/types/request-with-id.type';

export function applyRequestId(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
): void {
  const incomingId = request.header(REQUEST_ID_HEADER);
  const currentId = request.requestId;
  const requestId =
    currentId && /^[a-zA-Z0-9._-]{1,128}$/.test(currentId)
      ? currentId
      : incomingId && /^[a-zA-Z0-9._-]{1,128}$/.test(incomingId)
        ? incomingId
        : randomUUID();

  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    applyRequestId(request, response, next);
  }
}
