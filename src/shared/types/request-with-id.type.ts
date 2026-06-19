import type { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user.type';

export interface RequestWithId extends Request {
  requestId: string;
  user?: AuthenticatedUser;
}
