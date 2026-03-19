import { OverdueDetectionService } from '../../../src/services/OverdueDetectionService';
import { ITaskRepository, TaskWithAssignee } from '../../../src/repositories/TaskRepository';
import { INotificationService } from '../../../src/services/NotificationService';
import { User } from '../../../src/repositories/UserRepository';

function makeTask(overrides: Partial<TaskWithAssignee> = {}): TaskWithAssignee {
  return {
    id: 'task-1',
    title: 'Overdue Task',
    due_date: new Date('2024-01-01T00:00:00Z'),
    status: 'open',
    assignee_id: 'user-1',
    user_id: 'user-1',
    email: 'assignee@example.com',
    name: 'Assignee Name',
    timezone: 'UTC',
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    timezone: 'UTC',
    ...overrides,
  };
}

describe('OverdueDetectionService', () => {
  let service: OverdueDetectionService;
  let mockTaskRepo: jest.Mocked<ITaskRepository>;
  let mockNotificationService: jest.Mocked<INotificationService>;

  beforeEach(() => {
    mockTaskRepo = {
      findOverdueTasks: jest.fn(),
      findOverdueForUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateAssignee: jest.fn(),
    };

    mockNotificationService = {
      enqueueIfNotAlreadySent: jest.fn(),
      enqueueAssignmentNotification: jest.fn(),
    };

    service = new OverdueDetectionService(mockTaskRepo, mockNotificationService);
  });

  describe('detectAll()', () => {
    it('should call findOverdueTasks() on the task repository', async () => {
      mockTaskRepo.findOverdueTasks.mockResolvedValue([]);

      await service.detectAll().catch(() => {});

      expect(mockTaskRepo.findOverdueTasks).toHaveBeenCalled();
    });

    it('should call enqueueIfNotAlreadySent for each overdue task', async () => {
      const tasks = [
        makeTask({ id: 'task-1', assignee_id: 'u1' }),
        makeTask({ id: 'task-2', assignee_id: 'u2' }),
      ];
      mockTaskRepo.findOverdueTasks.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent.mockResolvedValue({ enqueued: true });

      await service.detectAll();

      expect(mockNotificationService.enqueueIfNotAlreadySent).toHaveBeenCalledTimes(2);
    });

    it('should call enqueueIfNotAlreadySent with the task object', async () => {
      const task = makeTask({ id: 'task-42' });
      mockTaskRepo.findOverdueTasks.mockResolvedValue([task]);
      mockNotificationService.enqueueIfNotAlreadySent.mockResolvedValue({ enqueued: true });

      await service.detectAll();

      expect(mockNotificationService.enqueueIfNotAlreadySent).toHaveBeenCalledWith(task);
    });

    it('should capture an error for a failing task and continue processing remaining tasks', async () => {
      const tasks = [
        makeTask({ id: 'task-1' }),
        makeTask({ id: 'task-2' }),
        makeTask({ id: 'task-3' }),
      ];
      mockTaskRepo.findOverdueTasks.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent
        .mockRejectedValueOnce(new Error('Notification failed for task-1'))
        .mockResolvedValueOnce({ enqueued: true })
        .mockResolvedValueOnce({ enqueued: true });

      const result = await service.detectAll();

      expect(result.errors).toHaveLength(1);
      expect(mockNotificationService.enqueueIfNotAlreadySent).toHaveBeenCalledTimes(3);
    });

    it('should NOT abort on a single task error — all tasks should be attempted', async () => {
      const tasks = [
        makeTask({ id: 'task-1' }),
        makeTask({ id: 'task-2' }),
        makeTask({ id: 'task-3' }),
      ];
      mockTaskRepo.findOverdueTasks.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent.mockRejectedValue(
        new Error('Always fails'),
      );

      const result = await service.detectAll();

      expect(mockNotificationService.enqueueIfNotAlreadySent).toHaveBeenCalledTimes(3);
      expect(result.errors).toHaveLength(3);
    });

    it('should return an OverdueDetectionResult with detected, enqueued, skipped, and errors fields', async () => {
      mockTaskRepo.findOverdueTasks.mockResolvedValue([]);

      const result = await service.detectAll();

      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('enqueued');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should set detected to the total number of overdue tasks found', async () => {
      const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })];
      mockTaskRepo.findOverdueTasks.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent.mockResolvedValue({ enqueued: true });

      const result = await service.detectAll();

      expect(result.detected).toBe(2);
    });

    it('should set enqueued to number of successfully enqueued notifications', async () => {
      const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })];
      mockTaskRepo.findOverdueTasks.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent
        .mockResolvedValueOnce({ enqueued: true })
        .mockResolvedValueOnce({ enqueued: false, skipped: true });

      const result = await service.detectAll();

      expect(result.enqueued).toBe(1);
    });

    it('should set skipped to number of notifications already sent', async () => {
      const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })];
      mockTaskRepo.findOverdueTasks.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent
        .mockResolvedValueOnce({ enqueued: false, skipped: true })
        .mockResolvedValueOnce({ enqueued: false, skipped: true });

      const result = await service.detectAll();

      expect(result.skipped).toBe(2);
    });

    it('should return empty errors array when all notifications succeed', async () => {
      const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })];
      mockTaskRepo.findOverdueTasks.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent.mockResolvedValue({ enqueued: true });

      const result = await service.detectAll();

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('detectForUser()', () => {
    it('should call findOverdueForUser with the user id', async () => {
      const user = makeUser({ id: 'user-xyz' });
      mockTaskRepo.findOverdueForUser.mockResolvedValue([]);

      await service.detectForUser(user).catch(() => {});

      expect(mockTaskRepo.findOverdueForUser).toHaveBeenCalledWith('user-xyz');
    });

    it('should NOT call findOverdueTasks()', async () => {
      const user = makeUser({ id: 'user-xyz' });
      mockTaskRepo.findOverdueForUser.mockResolvedValue([]);

      await service.detectForUser(user).catch(() => {});

      expect(mockTaskRepo.findOverdueTasks).not.toHaveBeenCalled();
    });

    it('should call enqueueIfNotAlreadySent for each task belonging to the user', async () => {
      const user = makeUser({ id: 'user-123' });
      const tasks = [
        makeTask({ id: 'task-1', assignee_id: 'user-123' }),
        makeTask({ id: 'task-2', assignee_id: 'user-123' }),
      ];
      mockTaskRepo.findOverdueForUser.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent.mockResolvedValue({ enqueued: true });

      await service.detectForUser(user);

      expect(mockNotificationService.enqueueIfNotAlreadySent).toHaveBeenCalledTimes(2);
    });

    it('should return an OverdueDetectionResult', async () => {
      const user = makeUser();
      mockTaskRepo.findOverdueForUser.mockResolvedValue([]);

      const result = await service.detectForUser(user);

      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('enqueued');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
    });

    it('should capture errors per task and continue for remaining tasks', async () => {
      const user = makeUser({ id: 'user-1' });
      const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })];
      mockTaskRepo.findOverdueForUser.mockResolvedValue(tasks);
      mockNotificationService.enqueueIfNotAlreadySent
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ enqueued: true });

      const result = await service.detectForUser(user);

      expect(result.errors).toHaveLength(1);
      expect(mockNotificationService.enqueueIfNotAlreadySent).toHaveBeenCalledTimes(2);
    });
  });
});
