import request from 'supertest';
import { createApp } from '../../../src/app';
import { ITaskRepository, TaskWithAssignee } from '../../../src/repositories/TaskRepository';
import { IUserRepository, User } from '../../../src/repositories/UserRepository';
import { INotificationService } from '../../../src/services/NotificationService';

function makeTask(overrides: Partial<TaskWithAssignee> = {}): TaskWithAssignee {
  return {
    id: 'task-1',
    title: 'Test Task',
    due_date: null,
    status: 'open',
    assignee_id: null,
    user_id: null,
    email: null,
    name: null,
    timezone: null,
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'assignee@example.com',
    name: 'Assignee User',
    timezone: 'UTC',
    ...overrides,
  };
}

describe('Task Routes Integration Tests', () => {
  let mockTaskRepo: jest.Mocked<ITaskRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockNotificationService: jest.Mocked<INotificationService>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    mockTaskRepo = {
      findOverdueTasks: jest.fn().mockResolvedValue([]),
      findOverdueForUser: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      create: jest.fn(),
      updateAssignee: jest.fn(),
    };

    mockUserRepo = {
      findById: jest.fn(),
      findByTimezones: jest.fn().mockResolvedValue([]),
    };

    mockNotificationService = {
      enqueueIfNotAlreadySent: jest.fn().mockResolvedValue({ enqueued: true }),
      enqueueAssignmentNotification: jest.fn().mockResolvedValue(undefined),
    };

    app = createApp({
      taskRepository: mockTaskRepo,
      userRepository: mockUserRepo,
      notificationService: mockNotificationService,
    });
  });

  describe('POST /tasks', () => {
    it('should return 201 with valid body containing only title (no assignee_id)', async () => {
      const createdTask = makeTask({ id: 'new-task', title: 'New Task' });
      mockTaskRepo.create.mockResolvedValue(createdTask);

      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
    });

    it('should NOT call enqueueAssignmentNotification when no assignee_id is provided', async () => {
      const createdTask = makeTask({ id: 'new-task', title: 'New Task' });
      mockTaskRepo.create.mockResolvedValue(createdTask);

      await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(mockNotificationService.enqueueAssignmentNotification).not.toHaveBeenCalled();
    });

    it('should return 201 when valid body includes an assignee_id', async () => {
      const user = makeUser({ id: 'user-abc' });
      const createdTask = makeTask({ id: 'new-task', title: 'Assigned Task', assignee_id: 'user-abc' });
      mockTaskRepo.create.mockResolvedValue(createdTask);
      mockUserRepo.findById.mockResolvedValue(user);

      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Assigned Task', assignee_id: 'user-abc' });

      expect(res.status).toBe(201);
    });

    it('should call enqueueAssignmentNotification exactly once when assignee_id is provided', async () => {
      const user = makeUser({ id: 'user-abc' });
      const createdTask = makeTask({ id: 'new-task', title: 'Assigned Task', assignee_id: 'user-abc' });
      mockTaskRepo.create.mockResolvedValue(createdTask);
      mockUserRepo.findById.mockResolvedValue(user);

      await request(app)
        .post('/tasks')
        .send({ title: 'Assigned Task', assignee_id: 'user-abc' });

      expect(mockNotificationService.enqueueAssignmentNotification).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when required fields are missing (empty body)', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return validation error details when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ due_date: '2024-12-31T00:00:00Z' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should return the created task in response body on success', async () => {
      const createdTask = makeTask({ id: 'new-task', title: 'New Task' });
      mockTaskRepo.create.mockResolvedValue(createdTask);

      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: 'new-task', title: 'New Task' });
    });

    it('should accept optional due_date as ISO string', async () => {
      const createdTask = makeTask({
        id: 'new-task',
        title: 'Task with due date',
        due_date: new Date('2024-12-31T00:00:00Z'),
      });
      mockTaskRepo.create.mockResolvedValue(createdTask);

      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task with due date', due_date: '2024-12-31T00:00:00Z' });

      expect(res.status).toBe(201);
    });
  });

  describe('PUT /tasks/:id/assign', () => {
    it('should return 200 when assigning a valid assigneeId', async () => {
      const user = makeUser({ id: 'user-abc' });
      const task = makeTask({ id: 'task-1' });
      const updatedTask = makeTask({ id: 'task-1', assignee_id: 'user-abc' });

      mockTaskRepo.findById.mockResolvedValue(task);
      mockTaskRepo.updateAssignee.mockResolvedValue(updatedTask);
      mockUserRepo.findById.mockResolvedValue(user);

      const res = await request(app)
        .put('/tasks/task-1/assign')
        .send({ assigneeId: 'user-abc' });

      expect(res.status).toBe(200);
    });

    it('should call enqueueAssignmentNotification when assigneeId is provided', async () => {
      const user = makeUser({ id: 'user-abc' });
      const task = makeTask({ id: 'task-1' });
      const updatedTask = makeTask({ id: 'task-1', assignee_id: 'user-abc' });

      mockTaskRepo.findById.mockResolvedValue(task);
      mockTaskRepo.updateAssignee.mockResolvedValue(updatedTask);
      mockUserRepo.findById.mockResolvedValue(user);

      await request(app)
        .put('/tasks/task-1/assign')
        .send({ assigneeId: 'user-abc' });

      expect(mockNotificationService.enqueueAssignmentNotification).toHaveBeenCalledTimes(1);
    });

    it('should return 404 when task does not exist', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      const res = await request(app)
        .put('/tasks/nonexistent-task/assign')
        .send({ assigneeId: 'user-abc' });

      expect(res.status).toBe(404);
    });

    it('should return 400 when assigneeId is missing from request body', async () => {
      const res = await request(app)
        .put('/tasks/task-1/assign')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
