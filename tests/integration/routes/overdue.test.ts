import request from 'supertest';
import { createApp } from '../../../src/app';
import { ITaskRepository, TaskWithAssignee } from '../../../src/repositories/TaskRepository';
import { IOverdueDetectionService, OverdueDetectionResult } from '../../../src/services/OverdueDetectionService';

const INTERNAL_SECRET = 'test-internal-secret-xyz';

function makeTask(overrides: Partial<TaskWithAssignee> = {}): TaskWithAssignee {
  return {
    id: 'task-1',
    title: 'Overdue Task',
    due_date: new Date('2024-01-01T00:00:00Z'),
    status: 'open',
    assignee_id: 'user-1',
    user_id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    timezone: 'UTC',
    ...overrides,
  };
}

function makeDetectionResult(overrides: Partial<OverdueDetectionResult> = {}): OverdueDetectionResult {
  return {
    detected: 0,
    enqueued: 0,
    skipped: 0,
    errors: [],
    ...overrides,
  };
}

describe('Internal Overdue Routes Integration Tests', () => {
  let mockTaskRepo: jest.Mocked<ITaskRepository>;
  let mockOverdueDetectionService: jest.Mocked<IOverdueDetectionService>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = INTERNAL_SECRET;

    mockTaskRepo = {
      findOverdueTasks: jest.fn().mockResolvedValue([]),
      findOverdueForUser: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      create: jest.fn(),
      updateAssignee: jest.fn(),
    };

    mockOverdueDetectionService = {
      detectAll: jest.fn().mockResolvedValue(makeDetectionResult({ detected: 5, enqueued: 3, skipped: 2 })),
      detectForUser: jest.fn().mockResolvedValue(makeDetectionResult()),
      detectForTimezone: jest.fn().mockResolvedValue(makeDetectionResult({ detected: 2, enqueued: 2 })),
    };

    app = createApp({
      taskRepository: mockTaskRepo,
      overdueDetectionService: mockOverdueDetectionService,
    });
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_SECRET;
  });

  describe('POST /internal/overdue/detect', () => {
    describe('Authentication', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const res = await request(app)
          .post('/internal/overdue/detect')
          .send({});

        expect(res.status).toBe(401);
      });

      it('should return 401 when Authorization header has wrong Bearer token', async () => {
        const res = await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', 'Bearer wrong-secret-value')
          .send({});

        expect(res.status).toBe(401);
      });

      it('should return 401 when Authorization header is malformed (not Bearer)', async () => {
        const res = await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', INTERNAL_SECRET)
          .send({});

        expect(res.status).toBe(401);
      });

      it('should proceed past authentication with correct Bearer token', async () => {
        const res = await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({});

        expect(res.status).not.toBe(401);
      });
    });

    describe('dry_run mode', () => {
      it('should return 200 with { detected: N, enqueued: 0, skipped: 0, errors: [] } for dry_run: true', async () => {
        const overdueTasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' }), makeTask({ id: 't3' })];
        mockTaskRepo.findOverdueTasks.mockResolvedValue(overdueTasks);

        const res = await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({ dry_run: true });

        expect(res.status).toBe(200);
        expect(res.body.detected).toBe(3);
        expect(res.body.enqueued).toBe(0);
        expect(res.body.skipped).toBe(0);
        expect(res.body.errors).toEqual([]);
      });

      it('should NOT call detectAll() when dry_run is true', async () => {
        mockTaskRepo.findOverdueTasks.mockResolvedValue([]);

        await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({ dry_run: true });

        expect(mockOverdueDetectionService.detectAll).not.toHaveBeenCalled();
      });

      it('should call findOverdueTasks to count overdue tasks in dry_run mode', async () => {
        mockTaskRepo.findOverdueTasks.mockResolvedValue([makeTask()]);

        await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({ dry_run: true });

        expect(mockTaskRepo.findOverdueTasks).toHaveBeenCalled();
      });
    });

    describe('normal (non-dry-run) mode', () => {
      it('should call OverdueDetectionService.detectAll() when no dry_run flag', async () => {
        const res = await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({});

        expect(res.status).toBe(200);
        expect(mockOverdueDetectionService.detectAll).toHaveBeenCalled();
      });

      it('should return the result from detectAll() as JSON', async () => {
        const detectionResult = makeDetectionResult({ detected: 5, enqueued: 3, skipped: 2, errors: [] });
        mockOverdueDetectionService.detectAll.mockResolvedValue(detectionResult);

        const res = await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ detected: 5, enqueued: 3, skipped: 2, errors: [] });
      });

      it('should NOT call findOverdueTasks directly when not in dry_run mode', async () => {
        await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({});

        expect(mockTaskRepo.findOverdueTasks).not.toHaveBeenCalled();
      });
    });

    describe('timezone-specific detection', () => {
      it('should call detectForTimezone() when timezone is provided in body', async () => {
        const res = await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({ timezone: 'America/New_York' });

        expect(res.status).toBe(200);
        expect(mockOverdueDetectionService.detectForTimezone).toHaveBeenCalledWith('America/New_York');
      });

      it('should NOT call detectAll() when timezone is provided', async () => {
        await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({ timezone: 'America/New_York' });

        expect(mockOverdueDetectionService.detectAll).not.toHaveBeenCalled();
      });

      it('should return result from detectForTimezone() as JSON', async () => {
        const timezoneResult = makeDetectionResult({ detected: 1, enqueued: 1 });
        mockOverdueDetectionService.detectForTimezone.mockResolvedValue(timezoneResult);

        const res = await request(app)
          .post('/internal/overdue/detect')
          .set('Authorization', `Bearer ${INTERNAL_SECRET}`)
          .send({ timezone: 'America/Chicago' });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ detected: 1, enqueued: 1 });
      });
    });
  });
});
