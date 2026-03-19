import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let mockReflector: jest.Mocked<Reflector>;

  function createMockExecutionContext(options: {
    user?: any;
    handlerRef?: Function;
    classRef?: Function;
  }): ExecutionContext {
    const handlerRef = options.handlerRef ?? function handler() {};
    const classRef = options.classRef ?? class Controller {};

    const mockRequest = {
      user: options.user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => handlerRef,
      getClass: () => classRef,
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new PermissionGuard(mockReflector);
  });

  it('returns true when no roles metadata is defined', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', roles: ['user'] },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('returns true when roles metadata is an empty array', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', roles: ['user'] },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('returns true when user.roles includes at least one required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin', 'moderator']);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', roles: ['moderator'] },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('returns true when user has multiple roles and one matches', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', roles: ['user', 'admin', 'editor'] },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('throws ForbiddenException when user.roles has no matching required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin', 'superuser']);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', roles: ['user', 'editor'] },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user has no roles at all', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', roles: [] },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user.roles is undefined and roles are required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
