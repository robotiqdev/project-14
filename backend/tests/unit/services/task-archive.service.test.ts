import { TaskArchiveService } from '../../../src/services/task-archive.service';
import { ITaskRepository } from '../../../src/repositories/task.repository';
import { IAuditRepository } from '../../../src/repositories/audit.repository';
import { ITask, TaskStatus, TaskPriority } from '../../../src/types/task.types';
import { IAuditLog } from '../../../src/types/audit.types';
import { ForbiddenStatusError, AlreadyArchivedError, NotFoundError } from '../../../src/errors/app-errors';

describe('TaskArchiveService', () => {
  let service: TaskArchiveService;
  let mockTaskRepository: jest.Mocked<ITaskRepository>;
  let mockAuditRepository: jest.Mocked<IAuditRepository>;

  const baseTask: ITask = {
    id: 'task-123',
    title: 'Test Task',
    description: 'A test task',
    status: TaskStatus.InProgress,
    priority: TaskPriority.Medium,
    teamId: 'team-456',
    assigneeId: 'user-789',
    createdById: 'user-001',
    archivedAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const archivedTask: ITask = {
    ...baseTask,
    status: TaskStatus.Archived,
    archivedAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuditLog: IAuditLog = {
    id: 'audit-001',
    entityType: 'Task',
    entityId: 'task-123',
    action: 'TASK_ARCHIVED',
    actorId: 'actor-123',
    metadata: {},
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockTaskRepository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockAuditRepository = {
      create: jest.fn(),
    };

    service = new TaskArchiveService(mockTaskRepository, mockAuditRepository);
  });

  describe('archiveTask', () => {
    describe('when task is in InProgress status', () => {
      it('should return the updated task with status Archived', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.InProgress });
        mockTaskRepository.updateStatus.mockResolvedValue(archivedTask);
        mockAuditRepository.create.mockResolvedValue(mockAuditLog);

        const result = await service.archiveTask('task-123', 'actor-123');

        expect(result.status).toBe(TaskStatus.Archived);
        expect(result.archivedAt).not.toBeNull();
      });

      it('should call taskRepository.updateStatus with status Archived and archivedAt set', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.InProgress });
        mockTaskRepository.updateStatus.mockResolvedValue(archivedTask);
        mockAuditRepository.create.mockResolvedValue(mockAuditLog);

        await service.archiveTask('task-123', 'actor-123');

        expect(mockTaskRepository.updateStatus).toHaveBeenCalledWith(
          'task-123',
          TaskStatus.Archived,
          expect.any(Date),
        );
      });

      it('should create an audit log record with action TASK_ARCHIVED', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.InProgress });
        mockTaskRepository.updateStatus.mockResolvedValue(archivedTask);
        mockAuditRepository.create.mockResolvedValue(mockAuditLog);

        await service.archiveTask('task-123', 'actor-123');

        expect(mockAuditRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'Task',
            entityId: 'task-123',
            action: 'TASK_ARCHIVED',
            actorId: 'actor-123',
          }),
        );
      });
    });

    describe('when task is in Completed status', () => {
      it('should return the updated task with status Archived', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Completed });
        mockTaskRepository.updateStatus.mockResolvedValue({ ...archivedTask });
        mockAuditRepository.create.mockResolvedValue(mockAuditLog);

        const result = await service.archiveTask('task-123', 'actor-123');

        expect(result.status).toBe(TaskStatus.Archived);
      });

      it('should call taskRepository.updateStatus with Archived status', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Completed });
        mockTaskRepository.updateStatus.mockResolvedValue(archivedTask);
        mockAuditRepository.create.mockResolvedValue(mockAuditLog);

        await service.archiveTask('task-123', 'actor-123');

        expect(mockTaskRepository.updateStatus).toHaveBeenCalledWith(
          'task-123',
          TaskStatus.Archived,
          expect.any(Date),
        );
      });

      it('should create an audit record on successful archive of Completed task', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Completed });
        mockTaskRepository.updateStatus.mockResolvedValue(archivedTask);
        mockAuditRepository.create.mockResolvedValue(mockAuditLog);

        await service.archiveTask('task-123', 'actor-123');

        expect(mockAuditRepository.create).toHaveBeenCalledTimes(1);
      });
    });

    describe('when task is in Draft status', () => {
      it('should throw ForbiddenStatusError', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Draft });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toThrow(ForbiddenStatusError);
      });

      it('should throw error with status code 422', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Draft });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toMatchObject({
          statusCode: 422,
        });
      });

      it('should NOT call taskRepository.updateStatus', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Draft });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toThrow(ForbiddenStatusError);

        expect(mockTaskRepository.updateStatus).not.toHaveBeenCalled();
      });

      it('should NOT create an audit record', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Draft });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toThrow(ForbiddenStatusError);

        expect(mockAuditRepository.create).not.toHaveBeenCalled();
      });
    });

    describe('when task is in Todo status', () => {
      it('should throw ForbiddenStatusError', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Todo });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toThrow(ForbiddenStatusError);
      });

      it('should throw error with status code 422', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Todo });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toMatchObject({
          statusCode: 422,
        });
      });

      it('should NOT call taskRepository.updateStatus', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Todo });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toThrow(ForbiddenStatusError);

        expect(mockTaskRepository.updateStatus).not.toHaveBeenCalled();
      });
    });

    describe('when task is already Archived', () => {
      it('should throw AlreadyArchivedError', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Archived, archivedAt: new Date() });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toThrow(AlreadyArchivedError);
      });

      it('should throw error with status code 422', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Archived, archivedAt: new Date() });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toMatchObject({
          statusCode: 422,
        });
      });

      it('should NOT call taskRepository.updateStatus', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Archived, archivedAt: new Date() });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toThrow(AlreadyArchivedError);

        expect(mockTaskRepository.updateStatus).not.toHaveBeenCalled();
      });

      it('should NOT create an audit record', async () => {
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.Archived, archivedAt: new Date() });

        await expect(service.archiveTask('task-123', 'actor-123')).rejects.toThrow(AlreadyArchivedError);

        expect(mockAuditRepository.create).not.toHaveBeenCalled();
      });
    });

    describe('when task does not exist', () => {
      it('should throw NotFoundError', async () => {
        mockTaskRepository.findById.mockResolvedValue(null);

        await expect(service.archiveTask('nonexistent-task', 'actor-123')).rejects.toThrow(NotFoundError);
      });

      it('should throw error with status code 404', async () => {
        mockTaskRepository.findById.mockResolvedValue(null);

        await expect(service.archiveTask('nonexistent-task', 'actor-123')).rejects.toMatchObject({
          statusCode: 404,
        });
      });
    });

    describe('audit record creation', () => {
      it('should create audit record with the correct actorId', async () => {
        const actorId = 'specific-actor-999';
        mockTaskRepository.findById.mockResolvedValue({ ...baseTask, status: TaskStatus.InProgress });
        mockTaskRepository.updateStatus.mockResolvedValue(archivedTask);
        mockAuditRepository.create.mockResolvedValue({ ...mockAuditLog, actorId });

        await service.archiveTask('task-123', actorId);

        expect(mockAuditRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ actorId }),
        );
      });

      it('should create audit record with the correct entityId matching the task id', async () => {
        const taskId = 'task-specific-456';
        const taskWithId: ITask = { ...baseTask, id: taskId, status: TaskStatus.InProgress };
        mockTaskRepository.findById.mockResolvedValue(taskWithId);
        mockTaskRepository.updateStatus.mockResolvedValue({ ...archivedTask, id: taskId });
        mockAuditRepository.create.mockResolvedValue({ ...mockAuditLog, entityId: taskId });

        await service.archiveTask(taskId, 'actor-123');

        expect(mockAuditRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ entityId: taskId }),
        );
      });
    });
  });
});
