import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { AuditService } from '../../services/audit.service';
import type { AuditLog, PaginatedResult } from '../../types/archive.types';

jest.mock('../../services/audit.service');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: '1h' });
};

// ─── Test Identifiers ────────────────────────────────────────────────────────

const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEAM_LEAD_USER_ID = '00000000-0000-0000-0000-000000000002';
const ACTOR_USER_ID = '00000000-0000-0000-0000-000000000003';

const TASK_ENTITY_ID = '20000000-0000-0000-0000-000000000001';
const LOG_IDS = {
  log1: 'a0000000-0000-0000-0000-000000000001',
  log2: 'a0000000-0000-0000-0000-000000000002',
  log3: 'a0000000-0000-0000-0000-000000000003',
  log4: 'a0000000-0000-0000-0000-000000000004',
  log5: 'a0000000-0000-0000-0000-000000000005',
  log6: 'a0000000-0000-0000-0000-000000000006',
  log7: 'a0000000-0000-0000-0000-000000000007',
  log8: 'a0000000-0000-0000-0000-000000000008',
  log9: 'a0000000-0000-0000-0000-000000000009',
  log10: 'a0000000-0000-0000-0000-000000000010',
};

const NON_EXISTENT_LOG_ID = '99999999-9999-9999-9999-999999999999';

const adminToken = generateToken(ADMIN_USER_ID, 'admin');
const nonAdminToken = generateToken(TEAM_LEAD_USER_ID, 'team_lead');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const buildAuditLog = (
  id: string,
  overrides: Partial<AuditLog> = {}
): AuditLog => ({
  id,
  entity_type: 'task',
  entity_id: TASK_ENTITY_ID,
  action: 'ARCHIVED',
  actor_id: ADMIN_USER_ID,
  before_state: { archived_at: null },
  after_state: { archived_at: '2024-01-15T10:00:00Z' },
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

const ALL_AUDIT_LOGS: AuditLog[] = [
  buildAuditLog(LOG_IDS.log1, { action: 'ARCHIVED' }),
  buildAuditLog(LOG_IDS.log2, { action: 'ARCHIVED' }),
  buildAuditLog(LOG_IDS.log3, { action: 'RESTORED', actor_id: ACTOR_USER_ID }),
  buildAuditLog(LOG_IDS.log4, { action: 'ARCHIVED', entity_type: 'team' }),
  buildAuditLog(LOG_IDS.log5, {
    action: 'UPDATED',
    created_at: '2024-02-01T10:00:00Z',
  }),
  buildAuditLog(LOG_IDS.log6, { action: 'ARCHIVED' }),
  buildAuditLog(LOG_IDS.log7, { action: 'ARCHIVED', actor_id: ACTOR_USER_ID }),
  buildAuditLog(LOG_IDS.log8, { action: 'DELETED' }),
  buildAuditLog(LOG_IDS.log9, { action: 'ARCHIVED' }),
  buildAuditLog(LOG_IDS.log10, { action: 'CREATED' }),
];

const PAGINATED_ALL: PaginatedResult<AuditLog> = {
  data: ALL_AUDIT_LOGS,
  total: 10,
  page: 1,
  limit: 10,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeError = (message: string, status: number): Error => {
  return Object.assign(new Error(message), { status });
};

// ─── Mock Setup ──────────────────────────────────────────────────────────────

const MockAuditService = AuditService as jest.MockedClass<typeof AuditService>;

let mockListAuditLogs: jest.Mock;
let mockGetAuditLog: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockListAuditLogs = jest.fn().mockResolvedValue(PAGINATED_ALL);
  mockGetAuditLog = jest.fn().mockResolvedValue(ALL_AUDIT_LOGS[0]);

  MockAuditService.prototype.listAuditLogs = mockListAuditLogs;
  MockAuditService.prototype.getAuditLog = mockGetAuditLog;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/admin/audit', () => {
  it('returns 200 with paginated list of all 10 audit log entries for admin', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total', 10);
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(10);
  });

  it('returns 403 for non-admin (team_lead) user', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no authorization token is provided', async () => {
    const res = await request(app).get('/api/admin/audit');

    expect(res.status).toBe(401);
  });

  it('returns 401 when authorization header is malformed', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', 'NotBearer sometoken');

    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid JWT', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', 'Bearer this.is.invalid');

    expect(res.status).toBe(401);
  });

  it('filters audit logs by entity_type and entity_id', async () => {
    const filteredLogs: PaginatedResult<AuditLog> = {
      data: ALL_AUDIT_LOGS.filter(
        l => l.entity_type === 'task' && l.entity_id === TASK_ENTITY_ID
      ),
      total: 9,
      page: 1,
      limit: 10,
    };
    mockListAuditLogs.mockResolvedValueOnce(filteredLogs);

    const res = await request(app)
      .get(`/api/admin/audit?entity_type=task&entity_id=${TASK_ENTITY_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListAuditLogs).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({
        entity_type: 'task',
        entity_id: TASK_ENTITY_ID,
      })
    );
  });

  it('filters audit logs by actor_id', async () => {
    const filtered: PaginatedResult<AuditLog> = {
      data: ALL_AUDIT_LOGS.filter(l => l.actor_id === ACTOR_USER_ID),
      total: 2,
      page: 1,
      limit: 10,
    };
    mockListAuditLogs.mockResolvedValueOnce(filtered);

    const res = await request(app)
      .get(`/api/admin/audit?actor_id=${ACTOR_USER_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListAuditLogs).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({ actor_id: ACTOR_USER_ID })
    );
    expect(res.body.total).toBe(2);
  });

  it('filters audit logs by action', async () => {
    const archivedLogs: PaginatedResult<AuditLog> = {
      data: ALL_AUDIT_LOGS.filter(l => l.action === 'ARCHIVED'),
      total: 6,
      page: 1,
      limit: 10,
    };
    mockListAuditLogs.mockResolvedValueOnce(archivedLogs);

    const res = await request(app)
      .get('/api/admin/audit?action=ARCHIVED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListAuditLogs).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({ action: 'ARCHIVED' })
    );
    expect(res.body.data.every((l: AuditLog) => l.action === 'ARCHIVED')).toBe(true);
  });

  it('filters audit logs by date range (from and to params)', async () => {
    const from = '2024-01-01';
    const to = '2024-01-31';

    const res = await request(app)
      .get(`/api/admin/audit?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListAuditLogs).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({ from_date: from, to_date: to })
    );
  });

  it('supports pagination params (page and limit)', async () => {
    const paginated: PaginatedResult<AuditLog> = {
      data: ALL_AUDIT_LOGS.slice(0, 5),
      total: 10,
      page: 1,
      limit: 5,
    };
    mockListAuditLogs.mockResolvedValueOnce(paginated);

    const res = await request(app)
      .get('/api/admin/audit?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockListAuditLogs).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({ page: 1, limit: 5 })
    );
    expect(res.body.data).toHaveLength(5);
  });

  it('returns 400 for invalid (non-numeric) pagination params', async () => {
    const res = await request(app)
      .get('/api/admin/audit?page=bad&limit=also-bad')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for negative page number', async () => {
    const res = await request(app)
      .get('/api/admin/audit?page=-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('combines multiple filters (action + actor_id + date range)', async () => {
    const from = '2024-01-01';
    const to = '2024-03-31';

    await request(app)
      .get(
        `/api/admin/audit?action=ARCHIVED&actor_id=${ACTOR_USER_ID}&from=${from}&to=${to}`
      )
      .set('Authorization', `Bearer ${adminToken}`);

    expect(mockListAuditLogs).toHaveBeenCalledWith(
      ADMIN_USER_ID,
      expect.objectContaining({
        action: 'ARCHIVED',
        actor_id: ACTOR_USER_ID,
        from_date: from,
        to_date: to,
      })
    );
  });
});

describe('GET /api/admin/audit/:logId', () => {
  it('returns 200 with single audit log entry detail', async () => {
    const logId = LOG_IDS.log1;
    const singleLog = ALL_AUDIT_LOGS[0];
    mockGetAuditLog.mockResolvedValueOnce(singleLog);

    const res = await request(app)
      .get(`/api/admin/audit/${logId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', singleLog.id);
    expect(res.body).toHaveProperty('entity_type');
    expect(res.body).toHaveProperty('entity_id');
    expect(res.body).toHaveProperty('action');
    expect(res.body).toHaveProperty('actor_id');
    expect(res.body).toHaveProperty('created_at');
    expect(mockGetAuditLog).toHaveBeenCalledWith(ADMIN_USER_ID, logId);
  });

  it('returns 404 for a non-existent audit log entry', async () => {
    mockGetAuditLog.mockRejectedValueOnce(
      makeError('Audit log not found', 404)
    );

    const res = await request(app)
      .get(`/api/admin/audit/${NON_EXISTENT_LOG_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed UUID in path param', async () => {
    const res = await request(app)
      .get('/api/admin/audit/not-a-valid-uuid-format')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 403 for non-admin user', async () => {
    const logId = LOG_IDS.log1;

    const res = await request(app)
      .get(`/api/admin/audit/${logId}`)
      .set('Authorization', `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const logId = LOG_IDS.log1;

    const res = await request(app).get(`/api/admin/audit/${logId}`);

    expect(res.status).toBe(401);
  });

  it('returns the before_state and after_state fields in the response', async () => {
    const logId = LOG_IDS.log1;
    const logWithStates = buildAuditLog(logId, {
      before_state: { archived_at: null },
      after_state: { archived_at: '2024-01-15T10:00:00Z' },
    });
    mockGetAuditLog.mockResolvedValueOnce(logWithStates);

    const res = await request(app)
      .get(`/api/admin/audit/${logId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('before_state');
    expect(res.body).toHaveProperty('after_state');
  });
});
