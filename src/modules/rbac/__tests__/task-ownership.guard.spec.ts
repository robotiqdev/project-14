import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TaskAccess } from '../../task-access/entities/task-access.entity';
import { TaskAccessReason } from '../enums/task-access-reason.enum';
import { TaskOwnershipGuard } from '../guards/task-ownership.guard';

describe('TaskOwnershipGuard', () => {
  let guard: TaskOwnershipGuard;
  let mockRepository: jest.Mocked<Partial<Repository<TaskAccess>>>;

  function createMockExecutionContext(options: {
    user?: any;
    params?: Record<string, string>;
  }): ExecutionContext {
    const mockRequest = {
      user: options.user,
      params: options.params ?? {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
    };

    guard = new TaskOwnershipGuard(mockRepository as unknown as Repository<TaskAccess>);
  });

  it('returns true when an active OWNER record exists for the user and task', async () => {
    const ownerRecord: Partial<TaskAccess> = {
      taskId: 'task-1',
      userId: 'user-1',
      accessReason: TaskAccessReason.OWNER,
      isActive: true,
    };
    (mockRepository.findOne as jest.Mock).mockResolvedValue(ownerRecord);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1' },
      params: { taskId: 'task-1' },
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          taskId: 'task-1',
          userId: 'user-1',
          accessReason: TaskAccessReason.OWNER,
          isActive: true,
        }),
      }),
    );
  });

  it('throws ForbiddenException when no OWNER record is found', async () => {
    (mockRepository.findOne as jest.Mock).mockResolvedValue(null);

    const ctx = createMockExecutionContext({
      user: { id: 'user-1' },
      params: { taskId: 'task-1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when found record is not OWNER reason', async () => {
    const nonOwnerRecord: Partial<TaskAccess> = {
      taskId: 'task-1',
      userId: 'user-1',
      accessReason: TaskAccessReason.CURRENT_ASSIGNEE,
      isActive: true,
    };
    (mockRepository.findOne as jest.Mock).mockResolvedValue(null); // OWNER lookup returns null

    const ctx = createMockExecutionContext({
      user: { id: 'user-1' },
      params: { taskId: 'task-1' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('uses taskId from request.params.taskId', async () => {
    (mockRepository.findOne as jest.Mock).mockResolvedValue({
      taskId: 'specific-task-id',
      userId: 'user-1',
      accessReason: TaskAccessReason.OWNER,
      isActive: true,
    });

    const ctx = createMockExecutionContext({
      user: { id: 'user-1' },
      params: { taskId: 'specific-task-id' },
    });

    await guard.canActivate(ctx);

    expect(mockRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ taskId: 'specific-task-id' }),
      }),
    );
  });
});
