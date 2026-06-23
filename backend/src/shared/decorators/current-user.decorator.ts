import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { RequestWithId } from '../types/request-with-id.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    if (!request.user) {
      throw new Error('CurrentUser was used without an authenticated request');
    }
    return request.user;
  },
);
