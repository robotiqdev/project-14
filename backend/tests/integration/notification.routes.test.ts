import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { NotificationController } from '../../src/controllers/notification.controller';
import { INotificationRepository } from '../../src/repositories/notification.repository';
import { createNotificationRouter } from '../../src/routes/notification.routes';
import { NotificationRecord, User } from '../../src/types';

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seedUser: User = { id: 'user_1', email: 'user@test.com', name: 'User', role: 'MEMBER' };

const makeRecord = (overrides: Partial<NotificationRecord> = {}): NotificationRecord => ({
  id: 'notif_1',
  userId: seedUser.id,
  channel: 'IN_APP',
  status: 'PENDING',
  payload: {
    taskId: 'task_1',
    actorId: 'actor_1',
    body: 'Some comment',
    recipients: [],
  },
  ...overrides,
});

// ─── App Factory ──────────────────────────────────────────────────────────────

function buildTestApp(
  notificationRepo: jest.Mocked<INotificationRepository>,
  currentUser: User
) {
  const app = express();
  app.use(express.json());

  // Inject user auth middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = currentUser;
    next();
  });

  const controller = new NotificationController(notificationRepo);
  const router = createNotificationRouter(controller);
  app.use(router);

  // Central error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Notification Routes Integration', () => {
  let notificationRepo: jest.Mocked<INotificationRepository>;

  beforeEach(() => {
    notificationRepo = {
      createBatch: jest.fn(),
      markDelivered: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      findPending: jest.fn(),
    };
  });

  // ─── GET /notifications ────────────────────────────────────────────────────

  describe('GET /notifications', () => {
    it('returns 200 with pending notifications for the authenticated user', async () => {
      const pending = [
        makeRecord({ id: 'notif_1', userId: seedUser.id, status: 'PENDING' }),
      ];
      notificationRepo.findPending.mockResolvedValue(pending);

      const app = buildTestApp(notificationRepo, seedUser);
      const res = await request(app).get('/notifications');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: 'notif_1', status: 'PENDING' });
    });

    it('passes the authenticated user id to findPending', async () => {
      notificationRepo.findPending.mockResolvedValue([]);

      const app = buildTestApp(notificationRepo, seedUser);
      await request(app).get('/notifications');

      expect(notificationRepo.findPending).toHaveBeenCalledWith(seedUser.id);
    });

    it('returns 200 with empty array when there are no pending notifications', async () => {
      notificationRepo.findPending.mockResolvedValue([]);

      const app = buildTestApp(notificationRepo, seedUser);
      const res = await request(app).get('/notifications');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ─── POST /notifications/:id/delivered ────────────────────────────────────

  describe('POST /notifications/:id/delivered', () => {
    it('returns 200 when marking a notification as delivered', async () => {
      const app = buildTestApp(notificationRepo, seedUser);
      const res = await request(app).post('/notifications/notif_1/delivered');

      expect(res.status).toBe(200);
    });

    it('calls notificationRepo.markDelivered with the correct notification id', async () => {
      const app = buildTestApp(notificationRepo, seedUser);
      await request(app).post('/notifications/notif_abc/delivered');

      expect(notificationRepo.markDelivered).toHaveBeenCalledWith('notif_abc');
    });

    it('returns success indicator in response body', async () => {
      const app = buildTestApp(notificationRepo, seedUser);
      const res = await request(app).post('/notifications/notif_1/delivered');

      expect(res.body).toMatchObject({ success: true });
    });
  });
});
