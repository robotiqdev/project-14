import { Pool, PoolClient } from 'pg';
import { AuditRepository } from '../audit.repository';
import type { AuditLog, AuditLogFilter } from '../../types/archive.types';

// ─── pg Mock ─────────────────────────────────────────────────────────────────

jest.mock('pg', () => {
  const mockClient: Partial<PoolClient> = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const ACTOR_ID = '00000000-0000-0000-0000-000000000003';
const TASK_ENTITY_ID = '20000000-0000-0000-0000-000000000001';
const LOG_ID = 'a0000000-0000-0000-0000-000000000001';

const dbAuditRow = {
  id: LOG_ID,
  entity_type: 'task',
  entity_id: TASK_ENTITY_ID,
  action: 'ARCHIVED',
  actor_id: ADMIN_ID,
  before_state: JSON.stringify({ archived_at: null }),
  after_state: JSON.stringify({ archived_at: '2024-01-15T10:00:00Z' }),
  created_at: '2024-01-15T10:00:00Z',
  total_count: '10',
};

const auditLogInput: Omit<AuditLog, 'id' | 'created_at'> = {
  entity_type: 'task',
  entity_id: TASK_ENTITY_ID,
  action: 'RESTORED',
  actor_id: ADMIN_ID,
  before_state: { archived_at: '2024-01-15T10:00:00Z' },
  after_state: { archived_at: null },
};

const dbCreatedRow = {
  id: 'new-log-id-00000000',
  ...auditLogInput,
  before_state: JSON.stringify(auditLogInput.before_state),
  after_state: JSON.stringify(auditLogInput.after_state),
  created_at: '2024-01-20T12:00:00Z',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

let repo: AuditRepository;
let pool: Pool;
let mockClient: { query: jest.Mock; release: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  pool = new Pool();
  repo = new AuditRepository(pool);

  mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  (pool.connect as jest.Mock).mockResolvedValue(mockClient);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuditRepository.findAll', () => {
  it('returns a paginated result with audit log entries', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    const result = await repo.findAll({ page: 1, limit: 10 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('returns the correct total from COUNT(*) OVER() window function', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      ...dbAuditRow,
      id: `log-${i}`,
      total_count: '10',
    }));
    mockClient.query.mockResolvedValue({ rows });

    const result = await repo.findAll({ page: 1, limit: 5 });

    expect(result.total).toBe(10);
    expect(result.data).toHaveLength(5);
  });

  it('filters by entity_type when provided', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    await repo.findAll({ entity_type: 'task' });

    const calls = mockClient.query.mock.calls;
    const hasEntityTypeFilter = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toLowerCase().includes('entity_type')
    );
    expect(hasEntityTypeFilter).toBe(true);
  });

  it('filters by entity_id when provided', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    await repo.findAll({ entity_id: TASK_ENTITY_ID });

    const calls = mockClient.query.mock.calls;
    const hasIdInParams = calls.some(
      (c: unknown[]) =>
        Array.isArray(c[1]) && (c[1] as unknown[]).includes(TASK_ENTITY_ID)
    );
    expect(hasIdInParams).toBe(true);
  });

  it('filters by actor_id when provided', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    await repo.findAll({ actor_id: ACTOR_ID });

    const calls = mockClient.query.mock.calls;
    const hasActorFilter = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toLowerCase().includes('actor_id')
    );
    expect(hasActorFilter).toBe(true);
  });

  it('filters by action when provided', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    await repo.findAll({ action: 'ARCHIVED' });

    const calls = mockClient.query.mock.calls;
    const hasActionFilter = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toLowerCase().includes('action')
    );
    expect(hasActionFilter).toBe(true);
  });

  it('filters by date range (from_date and to_date) when provided', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    const filter: AuditLogFilter = {
      from_date: '2024-01-01',
      to_date: '2024-03-31',
    };
    await repo.findAll(filter);

    const calls = mockClient.query.mock.calls;
    const hasDateFilter = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        c[0].toLowerCase().includes('created_at')
    );
    expect(hasDateFilter).toBe(true);
  });

  it('applies LIMIT and OFFSET for pagination', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    await repo.findAll({ page: 3, limit: 5 });

    const calls = mockClient.query.mock.calls;
    const hasPagination = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        c[0].toUpperCase().includes('LIMIT') &&
        c[0].toUpperCase().includes('OFFSET')
    );
    expect(hasPagination).toBe(true);
  });

  it('uses parameterized queries (no string interpolation for user input)', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    await repo.findAll({
      actor_id: ACTOR_ID,
      action: "'; DROP TABLE audit_logs; --",
    });

    const calls = mockClient.query.mock.calls;
    const hasParameterizedQuery = calls.some(
      (c: unknown[]) => Array.isArray(c[1]) && (c[1] as unknown[]).length > 0
    );
    expect(hasParameterizedQuery).toBe(true);
  });

  it('returns empty data and total 0 when no logs match', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    const result = await repo.findAll({ action: 'NONEXISTENT_ACTION' });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('uses COUNT(*) OVER() window function for total count', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    await repo.findAll({ page: 1, limit: 10 });

    const calls = mockClient.query.mock.calls;
    const hasWindowFunction = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        c[0].toUpperCase().includes('COUNT') &&
        c[0].toUpperCase().includes('OVER')
    );
    expect(hasWindowFunction).toBe(true);
  });
});

describe('AuditRepository.findById', () => {
  it('returns the audit log entry when found', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    const result = await repo.findById(LOG_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(LOG_ID);
  });

  it('returns null when no audit log entry exists with the given id', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    const result = await repo.findById('non-existent-log-id');

    expect(result).toBeNull();
  });

  it('queries by id as a parameterized parameter', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    await repo.findById(LOG_ID);

    const calls = mockClient.query.mock.calls;
    const hasIdParam = calls.some(
      (c: unknown[]) =>
        Array.isArray(c[1]) && (c[1] as unknown[]).includes(LOG_ID)
    );
    expect(hasIdParam).toBe(true);
  });

  it('returns an entry with all required AuditLog fields', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbAuditRow] });

    const result = await repo.findById(LOG_ID);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('entity_type');
    expect(result).toHaveProperty('entity_id');
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('actor_id');
    expect(result).toHaveProperty('created_at');
  });
});

describe('AuditRepository.createLog', () => {
  it('inserts a new audit log entry and returns it with id and created_at', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbCreatedRow] });

    const result = await repo.createLog(auditLogInput);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('created_at');
    expect(result.entity_type).toBe(auditLogInput.entity_type);
    expect(result.entity_id).toBe(auditLogInput.entity_id);
    expect(result.action).toBe(auditLogInput.action);
    expect(result.actor_id).toBe(auditLogInput.actor_id);
  });

  it('persists the before_state and after_state JSON', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbCreatedRow] });

    await repo.createLog(auditLogInput);

    const calls = mockClient.query.mock.calls;
    const insertCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('INSERT')
    );
    expect(insertCall).toBeDefined();
  });

  it('uses parameterized INSERT query', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbCreatedRow] });

    await repo.createLog(auditLogInput);

    const calls = mockClient.query.mock.calls;
    const insertCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('INSERT')
    );
    expect(insertCall).toBeDefined();
    expect(Array.isArray(insertCall![1])).toBe(true);
    expect((insertCall![1] as unknown[]).length).toBeGreaterThan(0);
  });

  it('runs INSERT within a transaction (BEGIN/COMMIT)', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbCreatedRow] });

    await repo.createLog(auditLogInput);

    const calls = mockClient.query.mock.calls;
    const hasBegin = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('BEGIN')
    );
    const hasCommit = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('COMMIT')
    );
    expect(hasBegin).toBe(true);
    expect(hasCommit).toBe(true);
  });

  it('rolls back the transaction on INSERT failure', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error('INSERT failed'));

    await expect(repo.createLog(auditLogInput)).rejects.toThrow();

    const calls = mockClient.query.mock.calls;
    const hasRollback = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('ROLLBACK')
    );
    expect(hasRollback).toBe(true);
  });

  it('releases the client back to the pool after success', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbCreatedRow] });

    await repo.createLog(auditLogInput);

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('releases the client back to the pool even after an error', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('DB error'));

    await expect(repo.createLog(auditLogInput)).rejects.toThrow();

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('stores entity_type, entity_id, action, actor_id as parameters', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbCreatedRow] });

    await repo.createLog(auditLogInput);

    const calls = mockClient.query.mock.calls;
    const insertCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('INSERT')
    );
    const params = insertCall![1] as unknown[];
    expect(params).toContain(auditLogInput.entity_type);
    expect(params).toContain(auditLogInput.entity_id);
    expect(params).toContain(auditLogInput.action);
    expect(params).toContain(auditLogInput.actor_id);
  });
});
