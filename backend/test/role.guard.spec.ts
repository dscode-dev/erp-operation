import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RoleGuard } from '../src/modules/auth/guards/role.guard';
import { ApplicationException } from '../src/shared/exceptions/application.exception';
import type { RequestWithId } from '../src/shared/types/request-with-id.type';

function contextFor(role: Role): ExecutionContext {
  const request = {
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'user@example.com',
      username: 'user',
      name: 'User',
      role,
      isActive: true,
    },
  } as RequestWithId;

  return {
    getHandler: () => contextFor,
    getClass: () => RoleGuard,
    switchToHttp: () => ({
      getRequest: <T>() => request as T,
      getResponse: <T>() => ({}) as T,
      getNext: <T>() => ({}) as T,
    }),
  } as unknown as ExecutionContext;
}

describe('RoleGuard', () => {
  it('allows an explicitly authorized role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce([Role.OWNER]),
    } as unknown as Reflector;
    const guard = new RoleGuard(reflector);

    expect(guard.canActivate(contextFor(Role.OWNER))).toBe(true);
  });

  it('denies a role outside the declared list', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce([Role.OWNER]),
    } as unknown as Reflector;
    const guard = new RoleGuard(reflector);

    let thrown: unknown;
    try {
      guard.canActivate(contextFor(Role.OPERATOR));
    } catch (error: unknown) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApplicationException);
    expect((thrown as ApplicationException).getStatus()).toBe(HttpStatus.FORBIDDEN);
  });

  it('allows public routes without evaluating roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(true),
    } as unknown as Reflector;
    const guard = new RoleGuard(reflector);

    expect(guard.canActivate(contextFor(Role.VIEWER))).toBe(true);
  });
});
