import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestWithId } from '../types/request-with-id.type';

export const RequestId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    return request.requestId;
  },
);
