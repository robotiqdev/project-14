import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { ITaskArchiveService } from '../../src/services/task-archive.service';
import { ITask, TaskStatus, TaskPriority } from '../../src/types/task.types';
import {
  ForbiddenStatusError,
  AlreadyArchivedError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from '../../src/errors/app-errors';

// Mock the middleware modules
jest.mock('../../src/api/middleware/requireAuth', () => ({
  requireAuth: jest.fn((req: any, _res: any, next: any) => {
    // Default: authenticated as team lead
    req.user = { id: 'actor-123', role: 'TeamLead' };
    next();
  }),
}));

jest.mock('../../src/api/middleware/requireTeamLead', () => ({
  requireTeamLead: jest.fn((_req: any, _res: any, next: any) => {
    next();
  }),
}));

import { requireAuth } from '../../src/api/middleware/requireAuth';
import { requireTeamLead } from '../../src/api/middleware/requireTeamLead';

const mockedRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockedRequireTeamLead = requireTeamLead as jest.MockedFunction<typeof requireTeamLead>;

describe('PATCH /api/tasks/:id/archive', () => {
  let app: Application;
  let mockTaskArchiveService: jest.Mocked<ITaskArchiveService>;

  const inProgressTask: ITask = {
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
    ...inProgressTask,
    status: TaskStatus.Archived,
    archivedAt: new Date('2024-06-01T12:00:00Z'),
    updatedAt: new Date('2024-06-01T12:00:00Z'),
  };

  beforeAll(() => {
    mockTaskArchiveService = {
      archiveTask: jest.fn(),
    };
    app = createApp(mockTaskArchiveService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset middleware to default (authenticated TeamLead)
    mockedRequireAuth.mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: 'actor-123', role: 'TeamLead' };
      next();
    });
    mockedRequireTeamLead.mockImplementation((_req: any, _res: any, next: any) => {
      next();
    });
  });

  describe('successful archive', () => {
    it('should return 200 with archived task body when caller is team lead and task is InProgress', async () => {
      mockTaskArchiveService.archiveTask.mockResolvedValue(archivedTask);

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'task-123',
        status: TaskStatus.Archived,
      });
    });

    it('should return the full archived task in response body', async () => {
      mockTaskArchiveService.archiveTask.mockResolvedValue(archivedTask);

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(TaskStatus.Archived);
      expect(response.body.archivedAt).toBeDefined();
    });

    it('should return 200 when task status is Completed', async () => {
      const completedTask: ITask = { ...inProgressTask, status: TaskStatus.Completed };
      const archivedFromCompleted: ITask = { ...archivedTask };
      mockTaskArchiveService.archiveTask.mockResolvedValue(archivedFromCompleted);

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(TaskStatus.Archived);
    });

    it('should call archiveTask service with the task id from URL params', async () => {
      mockTaskArchiveService.archiveTask.mockResolvedValue(archivedTask);

      await request(app)
        .patch('/api/tasks/task-999/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(mockTaskArchiveService.archiveTask).toHaveBeenCalledWith(
        'task-999',
        expect.any(String),
      );
    });

    it('should call archiveTask service with the authenticated actor id', async () => {
      mockedRequireAuth.mockImplementation((req: any, _res: any, next: any) => {
        req.user = { id: 'specific-actor-456', role: 'TeamLead' };
        next();
      });
      mockTaskArchiveService.archiveTask.mockResolvedValue(archivedTask);

      await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(mockTaskArchiveService.archiveTask).toHaveBeenCalledWith(
        expect.any(String),
        'specific-actor-456',
      );
    });
  });

  describe('error cases', () => {
    it('should return 422 when task is in Draft status', async () => {
      mockTaskArchiveService.archiveTask.mockRejectedValue(
        new ForbiddenStatusError('Task in Draft status cannot be archived'),
      );

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
    });

    it('should return 422 when task is in Todo status', async () => {
      mockTaskArchiveService.archiveTask.mockRejectedValue(
        new ForbiddenStatusError('Task in Todo status cannot be archived'),
      );

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
    });

    it('should return 422 with error message when status is forbidden', async () => {
      const errorMessage = 'Only InProgress or Completed tasks can be archived';
      mockTaskArchiveService.archiveTask.mockRejectedValue(
        new ForbiddenStatusError(errorMessage),
      );

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
      expect(response.body.error).toBeDefined();
    });

    it('should return 422 when task is already archived', async () => {
      mockTaskArchiveService.archiveTask.mockRejectedValue(
        new AlreadyArchivedError('Task is already archived'),
      );

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
    });

    it('should return 404 when task does not exist', async () => {
      mockTaskArchiveService.archiveTask.mockRejectedValue(
        new NotFoundError('Task not found'),
      );

      const response = await request(app)
        .patch('/api/tasks/nonexistent-task/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });

    it('should return 404 with error message when task not found', async () => {
      mockTaskArchiveService.archiveTask.mockRejectedValue(
        new NotFoundError('Task not found'),
      );

      const response = await request(app)
        .patch('/api/tasks/nonexistent-task/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('should return 403 when caller is not a team lead', async () => {
      mockedRequireTeamLead.mockImplementation((_req: any, res: any, _next: any) => {
        res.status(403).json({ error: 'Forbidden: caller is not a team lead of this task team' });
      });

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });

    it('should return 403 with an error message when not a team lead', async () => {
      mockedRequireTeamLead.mockImplementation((_req: any, res: any, _next: any) => {
        res.status(403).json({ error: 'Forbidden: caller is not a team lead of this task team' });
      });

      const response = await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 when no auth token is provided', async () => {
      mockedRequireAuth.mockImplementation((_req: any, res: any, _next: any) => {
        res.status(401).json({ error: 'Unauthorized: no auth token provided' });
      });

      const response = await request(app)
        .patch('/api/tasks/task-123/archive');

      expect(response.status).toBe(401);
    });

    it('should return 401 with an error message when not authenticated', async () => {
      mockedRequireAuth.mockImplementation((_req: any, res: any, _next: any) => {
        res.status(401).json({ error: 'Unauthorized: no auth token provided' });
      });

      const response = await request(app)
        .patch('/api/tasks/task-123/archive');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('middleware invocation order', () => {
    it('should invoke requireAuth before requireTeamLead', async () => {
      const callOrder: string[] = [];

      mockedRequireAuth.mockImplementation((req: any, _res: any, next: any) => {
        callOrder.push('requireAuth');
        req.user = { id: 'actor-123', role: 'TeamLead' };
        next();
      });

      mockedRequireTeamLead.mockImplementation((_req: any, _res: any, next: any) => {
        callOrder.push('requireTeamLead');
        next();
      });

      mockTaskArchiveService.archiveTask.mockResolvedValue(archivedTask);

      await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(callOrder).toEqual(['requireAuth', 'requireTeamLead']);
    });

    it('should not invoke the service if requireAuth rejects the request', async () => {
      mockedRequireAuth.mockImplementation((_req: any, res: any, _next: any) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app)
        .patch('/api/tasks/task-123/archive');

      expect(mockTaskArchiveService.archiveTask).not.toHaveBeenCalled();
    });

    it('should not invoke the service if requireTeamLead rejects the request', async () => {
      mockedRequireTeamLead.mockImplementation((_req: any, res: any, _next: any) => {
        res.status(403).json({ error: 'Forbidden' });
      });

      await request(app)
        .patch('/api/tasks/task-123/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(mockTaskArchiveService.archiveTask).not.toHaveBeenCalled();
    });
  });
});
