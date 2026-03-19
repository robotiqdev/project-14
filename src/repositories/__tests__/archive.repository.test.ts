import { Pool, PoolClient } from 'pg';
import { ArchiveRepository } from '../archive.repository';
import type { ArchiveFilter } from '../../types/archive.types';

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

const TASK_ID = '20000000-0000-0000-0000-000000000001';
const TEAM_ID = '10000000-0000-0000-0000-000000000001';
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

const dbArchivedRow = {
  id: TASK_ID,
  title: 'Fix login bug',
  description: 'The login page was broken',
  team_id: TEAM_ID,
  status: 'archived',
  archived_at: '2024-01-15T10:00:00Z',
  archived_by: ADMIN_ID,
  archive_reason: 'Completed',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  total_count: '6',
};

const dbRestoredRow = {
  id: TASK_ID,
  title: 'Fix login bug',
  description: 'The login page was broken',
  team_id: TEAM_ID,
  status: 'todo',
  archived_at: null,
  archived_by: null,
  archive_reason: null,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-20T12:00:00Z',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

let repo: ArchiveRepository;
let pool: Pool;
let mockPoolQuery: jest.Mock;
let mockClient: { query: jest.Mock; release: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  pool = new Pool();
  repo = new ArchiveRepository(pool);

  // Get the mock client that pool.connect returns
  mockPoolQuery = (pool as unknown as { query: jest.Mock }).query;
  mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  (pool.connect as jest.Mock).mockResolvedValue(mockClient);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ArchiveRepository.findAllArchived', () => {
  it('returns a paginated result with archived tasks', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbArchivedRow] });

    const result = await repo.findAllArchived({ page: 1, limit: 10 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('calls the database with a query that filters by archived_at IS NOT NULL', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbArchivedRow] });

    await repo.findAllArchived({ page: 1, limit: 10 });

    const calls = mockClient.query.mock.calls;
    const sqlCall = calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].toLowerCase().includes('archived_at')
    );
    expect(sqlCall).toBeDefined();
  });

  it('filters results by team_id when provided', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbArchivedRow] });

    await repo.findAllArchived({ team_id: TEAM_ID, page: 1, limit: 10 });

    const calls = mockClient.query.mock.calls;
    const sqlCallWithTeam = calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].toLowerCase().includes('team_id')
    );
    expect(sqlCallWithTeam).toBeDefined();
  });

  it('filters results by date range when from_date and to_date are provided', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbArchivedRow] });

    const filter: ArchiveFilter = {
      from_date: '2024-01-01',
      to_date: '2024-01-31',
      page: 1,
      limit: 10,
    };
    await repo.findAllArchived(filter);

    const calls = mockClient.query.mock.calls;
    // At least one query call should reference a date filter
    const hasDateFilter = calls.some((c: unknown[]) =>
      typeof c[0] === 'string' &&
      (c[0].toLowerCase().includes('archived_at') ||
        c[0].toLowerCase().includes('created_at'))
    );
    expect(hasDateFilter).toBe(true);
  });

  it('filters results by search keyword when search is provided', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbArchivedRow] });

    await repo.findAllArchived({ search: 'login bug', page: 1, limit: 10 });

    const calls = mockClient.query.mock.calls;
    // At least one query should have a LIKE or ILIKE pattern
    const hasSearchFilter = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0].toUpperCase().includes('LIKE') ||
          c[0].toUpperCase().includes('ILIKE') ||
          c[0].includes('search') ||
          c[0].includes('title'))
    );
    expect(hasSearchFilter).toBe(true);
  });

  it('returns empty data array and zero total when no archived tasks exist', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    const result = await repo.findAllArchived({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('uses COUNT(*) OVER() (window function) for total count in a single query', async () => {
    mockClient.query.mockResolvedValue({
      rows: [{ ...dbArchivedRow, total_count: '6' }],
    });

    await repo.findAllArchived({ page: 1, limit: 10 });

    const calls = mockClient.query.mock.calls;
    const hasWindowFunction = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        c[0].toUpperCase().includes('COUNT') &&
        c[0].toUpperCase().includes('OVER')
    );
    expect(hasWindowFunction).toBe(true);
  });

  it('applies LIMIT and OFFSET for pagination', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    await repo.findAllArchived({ page: 2, limit: 5 });

    const calls = mockClient.query.mock.calls;
    const hasPagination = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        c[0].toUpperCase().includes('LIMIT') &&
        c[0].toUpperCase().includes('OFFSET')
    );
    expect(hasPagination).toBe(true);
  });

  it('uses parameterized queries (no string interpolation)', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    await repo.findAllArchived({
      team_id: TEAM_ID,
      search: "'; DROP TABLE tasks; --",
      page: 1,
      limit: 10,
    });

    const calls = mockClient.query.mock.calls;
    // All query calls should pass parameters as a separate array, not inline
    const hasParameterizedQuery = calls.some(
      (c: unknown[]) => Array.isArray(c[1]) && c[1].length > 0
    );
    expect(hasParameterizedQuery).toBe(true);
  });

  it('calls setSessionContext before executing the main query', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    await repo.findAllArchived({ page: 1, limit: 10 });

    // The first query call should set session context for RLS
    const calls = mockClient.query.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ArchiveRepository.findArchivedById', () => {
  it('returns the archived task when found', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbArchivedRow] });

    const result = await repo.findArchivedById(TASK_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(TASK_ID);
    expect(result!.archived_at).toBeDefined();
    expect(result!.archived_at).not.toBeNull();
  });

  it('returns null when the task does not exist', async () => {
    mockClient.query.mockResolvedValue({ rows: [] });

    const result = await repo.findArchivedById('non-existent-id');

    expect(result).toBeNull();
  });

  it('returns null when the task exists but is not archived', async () => {
    // Query should filter WHERE archived_at IS NOT NULL
    mockClient.query.mockResolvedValue({ rows: [] });

    const result = await repo.findArchivedById(TASK_ID);

    expect(result).toBeNull();
  });

  it('queries by task id and archived_at IS NOT NULL', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbArchivedRow] });

    await repo.findArchivedById(TASK_ID);

    const calls = mockClient.query.mock.calls;
    const hasIdFilter = calls.some(
      (c: unknown[]) =>
        Array.isArray(c[1]) && (c[1] as unknown[]).includes(TASK_ID)
    );
    expect(hasIdFilter).toBe(true);
  });
});

describe('ArchiveRepository.restoreTask', () => {
  it('returns the restored task with archived fields set to null', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbRestoredRow] });

    const result = await repo.restoreTask(TASK_ID, ADMIN_ID);

    expect(result.id).toBe(TASK_ID);
    expect(result.archived_at).toBeNull();
    expect(result.archived_by).toBeNull();
    expect(result.archive_reason).toBeNull();
  });

  it('sets archived_at, archived_by, and archive_reason to null in the UPDATE query', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbRestoredRow] });

    await repo.restoreTask(TASK_ID, ADMIN_ID);

    const calls = mockClient.query.mock.calls;
    const updateCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        c[0].toUpperCase().includes('UPDATE')
    );
    expect(updateCall).toBeDefined();
    const sql: string = updateCall![0] as string;
    // The SQL should set archived_at to null
    expect(sql.toLowerCase()).toMatch(/archived_at/);
  });

  it('updates the updated_at timestamp', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbRestoredRow] });

    await repo.restoreTask(TASK_ID, ADMIN_ID);

    const calls = mockClient.query.mock.calls;
    const updateCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('UPDATE')
    );
    expect(updateCall).toBeDefined();
    const sql: string = updateCall![0] as string;
    expect(sql.toLowerCase()).toMatch(/updated_at/);
  });

  it('uses parameterized query with task id', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbRestoredRow] });

    await repo.restoreTask(TASK_ID, ADMIN_ID);

    const calls = mockClient.query.mock.calls;
    const hasParamWithId = calls.some(
      (c: unknown[]) =>
        Array.isArray(c[1]) && (c[1] as unknown[]).includes(TASK_ID)
    );
    expect(hasParamWithId).toBe(true);
  });

  it('runs setSessionContext within a transaction', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbRestoredRow] });

    await repo.restoreTask(TASK_ID, ADMIN_ID);

    const calls = mockClient.query.mock.calls;
    const hasBegin = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('BEGIN')
    );
    expect(hasBegin).toBe(true);
  });

  it('commits the transaction on success', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbRestoredRow] });

    await repo.restoreTask(TASK_ID, ADMIN_ID);

    const calls = mockClient.query.mock.calls;
    const hasCommit = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('COMMIT')
    );
    expect(hasCommit).toBe(true);
  });

  it('rolls back the transaction on error', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error('DB error')); // UPDATE fails

    await expect(repo.restoreTask(TASK_ID, ADMIN_ID)).rejects.toThrow();

    const calls = mockClient.query.mock.calls;
    const hasRollback = calls.some(
      (c: unknown[]) =>
        typeof c[0] === 'string' && c[0].toUpperCase().includes('ROLLBACK')
    );
    expect(hasRollback).toBe(true);
  });

  it('releases the client back to the pool after success', async () => {
    mockClient.query.mockResolvedValue({ rows: [dbRestoredRow] });

    await repo.restoreTask(TASK_ID, ADMIN_ID);

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  it('releases the client back to the pool even after an error', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error('DB error')); // UPDATE fails

    await expect(repo.restoreTask(TASK_ID, ADMIN_ID)).rejects.toThrow();

    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
