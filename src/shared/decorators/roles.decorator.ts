import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { ROLES_KEY } from '../constants/auth.constants';

export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
