import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Action } from '../../../common/enums/action.enum';
import { RBAC_PERMISSIONS_KEY } from '../../../common/constants/rbac.constants';
import { RbacGuard } from '../guards/rbac.guard';
import { PermissionService } from '../services/permission.service';
import { TaskAccessReason } from '../enums/task-access-reason.enum';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockPermissionService: jest.Mocked<Partial<PermissionService>>;

  function createMockExecutionContext(options: {
    user?: any;
    params?: Record<string, string>;
    requiredActions?: Action[];
    handlerRef?: Function;
    classRef?: Function;
  }): ExecutionContext {
    const handlerRef = options.handlerRef ?? function handler() {};
    const classRef = options.classRef ?? class Controller {};

    const mockRequest = {
      user: options.user,
      params: options.params ?? {},
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

    mockPermissionService = {
      checkPermission: jest.fn(),
    };

    guard = new RbacGuard(
      mockReflector,
      mockPermissionService as unknown as PermissionService,
    );
  });

  it('returns true when RequirePermissions metadata is empty (no permissions required)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);

    const ctx = createMockExecutionContext({ user: { id: 'user-1' }, params: {} });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
  });

  it('returns true when RequirePermissions metadata is undefined', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const ctx = createMockExecutionContext({ user: { id: 'user-1' }, params: {} });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockPermissionService.checkPermission).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when request.user is undefined', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Action.READ]);

    const ctx = createMockExecutionContext({
      user: undefined,
      params: { taskId: 'task-1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws BadRequestException when taskId param is absent', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Action.READ]);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', email: 'user@test.com', roles: [] },
      params: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('reads taskId from request.params.taskId', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Action.READ]);
    (mockPermissionService.checkPermission as jest.Mock).mockResolvedValue({
      allowed: true,
      reason: TaskAccessReason.OWNER,
    });

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', email: 'user@test.com', roles: [] },
      params: { taskId: 'task-abc' },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'task-abc' }),
    );
  });

  it('reads taskId from request.params.id when taskId is not present', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([Action.READ]);
    (mockPermissionService.checkPermission as jest.Mock).mockResolvedValue({
      allowed: true,
      reason: TaskAccessReason.OWNER,
    });

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', email: 'user@test.com', roles: [] },
      params: { id: 'task-xyz' },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'task-xyz' }),
    );
  });

  it('calls checkPermission for each required action and returns true if all pass', async () => {
    const requiredActions = [Action.READ, Action.WRITE, Action.COMMENT];
    mockReflector.getAllAndOverride.mockReturnValue(requiredActions);
    (mockPermissionService.checkPermission as jest.Mock).mockResolvedValue({
      allowed: true,
      reason: TaskAccessReason.OWNER,
    });

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', email: 'user@test.com', roles: [] },
      params: { taskId: 'task-1' },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockPermissionService.checkPermission).toHaveBeenCalledTimes(3);
    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith({
      userId: 'user-1',
      taskId: 'task-1',
      action: Action.READ,
    });
    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith({
      userId: 'user-1',
      taskId: 'task-1',
      action: Action.WRITE,
    });
    expect(mockPermissionService.checkPermission).toHaveBeenCalledWith({
      userId: 'user-1',
      taskId: 'task-1',
      action: Action.COMMENT,
    });
  });

  it('throws ForbiddenException with deniedBecause message when one required action fails', async () => {
    const requiredActions = [Action.READ, Action.DELETE];
    mockReflector.getAllAndOverride.mockReturnValue(requiredActions);

    (mockPermissionService.checkPermission as jest.Mock).mockImplementation(
      async ({ action }: { action: Action }) => {
        if (action === Action.READ) {
          return { allowed: true, reason: TaskAccessReason.CURRENT_ASSIGNEE };
        }
        return {
          allowed: false,
          reason: TaskAccessReason.CURRENT_ASSIGNEE,
          deniedBecause: 'Action DELETE is not permitted for your access level',
        };
      },
    );

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', email: 'user@test.com', roles: [] },
      params: { taskId: 'task-1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('includes deniedBecause in the ForbiddenException message', async () => {
    const deniedMessage = 'Access has expired';
    mockReflector.getAllAndOverride.mockReturnValue([Action.READ]);
    (mockPermissionService.checkPermission as jest.Mock).mockResolvedValue({
      allowed: false,
      reason: null,
      deniedBecause: deniedMessage,
    });

    const ctx = createMockExecutionContext({
      user: { id: 'user-1', email: 'user@test.com', roles: [] },
      params: { taskId: 'task-1' },
    });

    try {
      await guard.canActivate(ctx);
      fail('Expected ForbiddenException to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toContain(deniedMessage);
    }
  });

  it('uses RBAC_PERMISSIONS_KEY to read metadata from Reflector', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);

    const handler = function myHandler() {};
    const ctrl = class MyController {};
    const ctx = createMockExecutionContext({
      user: { id: 'user-1' },
      params: {},
      handlerRef: handler,
      classRef: ctrl,
    });

    await guard.canActivate(ctx);

    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
      RBAC_PERMISSIONS_KEY,
      [handler, ctrl],
    );
  });
});
