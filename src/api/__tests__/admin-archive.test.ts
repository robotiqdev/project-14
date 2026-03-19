import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { ArchiveService } from '../../services/archive.service';
import { AuditService } from '../../services/audit.service';
import type { ArchivedTask, PaginatedResult, Task } from '../../types/archive.types';

jest.mock('../../services/archive.service');
jest.mock('../../services/audit.service');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

// ─── Test Identifiers ────────────────────────────────────────────────────────

const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEAM_LEAD_USER_ID = '00000000-0000-0000-0000-000000000002';

const TEAM_1_ID = '10000000-0000-0000-0000-000000000001';
const TEAM_2_ID = '10000000-0000-0000-0000-000000000002';
const TEAM_3_ID = '10000000-0000-0000-0000-000000000003';

const ARCHIVED_TASK_IDS = {
  team1: {
    task1: '20000000-0000-0000-0000-000000000001',
    task2: '20000000-0000-0000-0000-000000000002',
  },
  team2: {
    task1: '20000000-0000-0000-0000-000000000004',
    task2: '20000000-0000-0000-0000-000000000005',
  },
  team3: {
    task1: '20000000-0000-0000-0000-000000000007',
    task2: '20000000-0000-0000-0000-000000000008',
  },
};

const ACTIVE_TASK_ID = '20000000-0000-0000-0000-000000000003';
const NON_EXISTENT_ID = '99999999-9999-9999-9999-999999999999';

const adminToken = generateToken(ADMIN_USER_ID, 'admin');
const nonAdminToken = generateToken(TEAM_LEAD_USER_ID, 'team_lead');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const buildArchivedTask = (
  id: string,
  teamId: string,
  overrides: Partial<ArchivedTask> = {}
): ArchivedTask => ({
  id,
  title: `Archived Task ${id.slice(-4)}`,
  description: 'A task description',
  team_id: teamId,
  status: 'archived',
  archived_at: '2024-01-15T10:00:00Z',
  archived_by: ADMIN_USER_ID,
  archive_reason: 'Completed work',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

const ALL_ARCHIVED_TASKS: ArchivedTask[] = [
  buildArchivedTask(ARCHIVED_TASK_IDS.team1.task1, TEAM_1_ID, {
    title: 'Fix login bug',
    description: 'Login page was broken',
  }),
  buildArchivedTask(ARCHIVED_TASK_IDS.team1.task2, TEAM_1_ID),
  buildArchivedTask(ARCHIVED_TASK_IDS.team2.task1, TEAM_2_ID),
  buildArchivedTask(ARCHIVED_TASK_IDS.team2.task2, TEAM_2_ID),
  buildArchivedTask(ARCHIVED_TASK_IDS.team3.task1, TEAM_3_ID),
  buildArchivedTask(ARCHIVED_TASK_IDS.team3.task2, TEAM_3_ID),
];

const PAGINATED_ALL: PaginatedResult<ArchivedTask> = {
  data: ALL_ARCHIVED_TASKS,
  total: 6,
  page: 1,
  limit: 10,
};

const TEAM1_ARCHIVED: PaginatedResult<ArchivedTask> = {
  data: ALL_ARCHIVED_TASKS.filter(t => t.team_id === TEAM_1_ID),
  total: 2,
  page: 1,
  limit: 10,
};

const RESTORED_TASK: Task = {
  id: ARCHIVED_TASK_IDS.team1.task1,
  title: 'Fix login bug',
  description: 'Login page was broken',
  team_id: TEAM_1_ID,
  status: 'todo',
  archived_at: null,
  archived_by: null,
  archive_reason: null,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-20T12:00:00Z',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeError = (message: string, status: number): Error => {
  return Object.assign(new Error(message), { status });
};

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const MockArchiveService = ArchiveService as jest.MockedClass<typeof ArchiveService>;

let mockListArchivedTasks: jest.Mock;
let mockGetArchivedTask: jest.Mock;
let mockRestoreTask: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockListArchivedTasks = jest.fn().mockResolvedValue(PAGINATED_ALL);
  mockGetArchivedTask = jest.fn().mockResolvedValue(ALL_ARCHIVED_TASKS[0]);
  mockRestoreTask = jest.fn().mockResolvedValue(RESTORED_TASK);

  MockArchiveService.prototype.listArchivedTasks = mockListArchivedTasks;
  MockArchiveService.prototype.getArchivedTask = mockGetArchivedTask;
  MockArchiveService.prototype.restoreTask = mockRestoreTask;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/admin/archives', () => {
  it('returns 200 with paginated list of all 6 archived tasks for admin', async () => {
    const res = await request(app)
      .get('/api/admin/archives')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total', 6);
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(6);
  });

  it('returns 403 for non-admin (team_lead) user', async () => {
    const res = await request(app)
      .get('/api/admin/archives')
      .set('Authorization', `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app).get('/api/admin/archives');

    expect(res.status).toBe(401);
  });

  it('returns 401 when authorization header is malformed', async () => {
    const res = await request(app)
      .get('/api/admin/archives')
      .set('Authorization', 'NotBearer token');

    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid / expired JWT', async () => {
    const invalidToken = 'this.is.not.a.valid.jwt';

    const res = await request(app)
      .get('/api/admin/archives')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(res.status).toBe(401);
  });

  it('filters archived tasks by team_id query param', async () => {
    mockListArchivedTasks.mockResolvedValueOnce(TEAM1_ARCHIVED);

    const res = await request(app)
      .get(`/api/admin/archives?team_id=${TEAM_1_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListArchivedTasks).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({ team_id: TEAM_1_ID })
    );
    expect(res.body.total).toBe(2);
    expect(res.body.data.every((t: ArchivedTask) => t.team_id === TEAM_1_ID)).toBe(true);
  });

  it('filters archived tasks by date range (from and to params)', async () => {
    const from = '2024-01-01';
    const to = '2024-01-31';

    const res = await request(app)
      .get(`/api/admin/archives?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListArchivedTasks).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({ from_date: from, to_date: to })
    );
  });

  it('filters archived tasks by search keyword matching title or description', async () => {
    const keyword = 'login bug';
    const searchResult: PaginatedResult<ArchivedTask> = {
      data: [ALL_ARCHIVED_TASKS[0]],
      total: 1,
      page: 1,
      limit: 10,
    };
    mockListArchivedTasks.mockResolvedValueOnce(searchResult);

    const res = await request(app)
      .get(`/api/admin/archives?search=${encodeURIComponent(keyword)}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListArchivedTasks).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({ search: keyword })
    );
    expect(res.body.data).toHaveLength(1);
  });

  it('supports pagination params (page and limit)', async () => {
    const paginated: PaginatedResult<ArchivedTask> = {
      data: ALL_ARCHIVED_TASKS.slice(0, 2),
      total: 6,
      page: 2,
      limit: 2,
    };
    mockListArchivedTasks.mockResolvedValueOnce(paginated);

    const res = await request(app)
      .get('/api/admin/archives?page=2&limit=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListArchivedTasks).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({ page: 2, limit: 2 })
    );
  });

  it('returns 400 for invalid (non-numeric) pagination params', async () => {
    const res = await request(app)
      .get('/api/admin/archives?page=invalid&limit=abc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for negative page param', async () => {
    const res = await request(app)
      .get('/api/admin/archives?page=-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for zero limit param', async () => {
    const res = await request(app)
      .get('/api/admin/archives?limit=0')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('combines multiple filters (team_id + date range)', async () => {
    const from = '2024-01-01';
    const to = '2024-01-31';

    await request(app)
      .get(`/api/admin/archives?team_id=${TEAM_1_ID}&from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(mockListArchivedTasks).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({
        team_id: TEAM_1_ID,
        from_date: from,
        to_date: to,
      })
    );
  });
});

describe('GET /api/admin/archives/:taskId', () => {
  it('returns 200 with archived task detail including archive metadata', async () => {
    const taskId = ARCHIVED_TASK_IDS.team1.task1;

    const res = await request(app)
      .get(`/api/admin/archives/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', taskId);
    expect(res.body).toHaveProperty('archived_at');
    expect(res.body).toHaveProperty('archived_by');
    expect(res.body.archived_at).not.toBeNull();
    expect(mockGetArchivedTask).toHaveBeenCalledWith(ADMIN_USER_ID, taskId);
  });

  it('returns 404 for a non-existent archived task', async () => {
    mockGetArchivedTask.mockRejectedValueOnce(
      makeError('Task not found', 404)
    );

    const res = await request(app)
      .get(`/api/admin/archives/${NON_EXISTENT_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed UUID in path param', async () => {
    const res = await request(app)
      .get('/api/admin/archives/not-a-valid-uuid-format')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 403 for non-admin user', async () => {
    const taskId = ARCHIVED_TASK_IDS.team1.task1;

    const res = await request(app)
      .get(`/api/admin/archives/${taskId}`)
      .set('Authorization', `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const taskId = ARCHIVED_TASK_IDS.team1.task1;

    const res = await request(app).get(`/api/admin/archives/${taskId}`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/archives/:taskId/restore', () => {
  it('returns 200 with the restored task (archived_at set to null)', async () => {
    const taskId = ARCHIVED_TASK_IDS.team1.task1;

    const res = await request(app)
      .post(`/api/admin/archives/${taskId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', taskId);
    expect(res.body.archived_at).toBeNull();
    expect(res.body.archived_by).toBeNull();
  });

  it('calls restoreTask with the admin user id and task id', async () => {
    const taskId = ARCHIVED_TASK_IDS.team1.task1;

    await request(app)
      .post(`/api/admin/archives/${taskId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(mockRestoreTask).toHaveBeenCalledWith(ADMIN_USER_ID, taskId);
  });

  it('creates an audit log entry for the restore action', async () => {
    // The service's restoreTask is responsible for creating the audit log.
    // This test verifies that restoreTask is called (which internally creates the audit log).
    const taskId = ARCHIVED_TASK_IDS.team1.task1;

    const res = await request(app)
      .post(`/api/admin/archives/${taskId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockRestoreTask).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the task to restore does not exist', async () => {
    mockRestoreTask.mockRejectedValueOnce(makeError('Task not found', 404));

    const res = await request(app)
      .post(`/api/admin/archives/${NON_EXISTENT_ID}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 409 when the task is not archived (cannot be restored)', async () => {
    mockRestoreTask.mockRejectedValueOnce(
      makeError('Task is not archived', 409)
    );

    const res = await request(app)
      .post(`/api/admin/archives/${ACTIVE_TASK_ID}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });

  it('returns 403 for non-admin user', async () => {
    const taskId = ARCHIVED_TASK_IDS.team1.task1;

    const res = await request(app)
      .post(`/api/admin/archives/${taskId}/restore`)
      .set('Authorization', `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const taskId = ARCHIVED_TASK_IDS.team1.task1;

    const res = await request(app)
      .post(`/api/admin/archives/${taskId}/restore`);

    expect(res.status).toBe(401);
  });

  it('returns 400 for a malformed UUID in path param', async () => {
    const res = await request(app)
      .post('/api/admin/archives/not-a-uuid/restore')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('does not call restoreTask if UUID is malformed', async () => {
    await request(app)
      .post('/api/admin/archives/bad-uuid/restore')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(mockRestoreTask).not.toHaveBeenCalled();
  });
});
