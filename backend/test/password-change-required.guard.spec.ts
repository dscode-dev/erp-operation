import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PasswordChangeRequiredGuard } from '../src/modules/auth/guards/password-change-required.guard';
import { ApplicationException } from '../src/shared/exceptions/application.exception';
import type { RequestWithId } from '../src/shared/types/request-with-id.type';

function contextFor(mustChangePassword: boolean): ExecutionContext {
  const request = {
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'user@example.com',
      username: 'user',
      name: 'User',
      role: Role.OPERATOR,
      isActive: true,
      mustChangePassword,
    },
  } as RequestWithId;

  return {
    getHandler: () => contextFor,
    getClass: () => PasswordChangeRequiredGuard,
    switchToHttp: () => ({
      getRequest: <T>() => request as T,
      getResponse: <T>() => ({}) as T,
      getNext: <T>() => ({}) as T,
    }),
  } as unknown as ExecutionContext;
}

describe('PasswordChangeRequiredGuard', () => {
  it('allows users whose password is already permanent', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(false),
    } as unknown as Reflector;

    expect(new PasswordChangeRequiredGuard(reflector).canActivate(contextFor(false))).toBe(true);
  });

  it('blocks normal resources while a password change is required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(false),
    } as unknown as Reflector;

    let thrown: unknown;
    try {
      new PasswordChangeRequiredGuard(reflector).canActivate(contextFor(true));
    } catch (error: unknown) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApplicationException);
    expect((thrown as ApplicationException).getStatus()).toBe(HttpStatus.FORBIDDEN);
  });

  it('allows explicitly exempt password bootstrap routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true),
    } as unknown as Reflector;

    expect(new PasswordChangeRequiredGuard(reflector).canActivate(contextFor(true))).toBe(true);
  });
});
