import { AuditService } from '../audit.service';
import { AuditRepository } from '../../repositories/audit.repository';
import type { AuditLog, AuditLogFilter, PaginatedResult } from '../../types/archive.types';

// ─── Mock Repos ──────────────────────────────────────────────────────────────

const mockAuditRepo: jest.Mocked<Pick<AuditRepository, 'findAll' | 'findById' | 'createLog'>> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  createLog: jest.fn(),
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ADMIN_ID = 'admin-00000000-0000-0000-0000-000000000001';
const LOG_ID = 'log-00000000-0000-0000-0000-000000000001';

const buildLog = (id: string, overrides: Partial<AuditLog> = {}): AuditLog => ({
  id,
  entity_type: 'task',
  entity_id: 'task-00000000-0000-0000-0000-000000000001',
  action: 'ARCHIVED',
  actor_id: ADMIN_ID,
  before_state: { archived_at: null },
  after_state: { archived_at: '2024-01-15T10:00:00Z' },
  created_at: '2024-01-15T10:00:00Z',
  ...overrides,
});

const singleLog = buildLog(LOG_ID);

const allLogs = Array.from({ length: 10 }, (_, i) =>
  buildLog(`log-0000000-0000-0000-0000-00000000000${i + 1}`)
);

const paginatedAll: PaginatedResult<AuditLog> = {
  data: allLogs,
  total: 10,
  page: 1,
  limit: 10,
};

// ─── Service Instance ────────────────────────────────────────────────────────

let service: AuditService;

beforeEach(() => {
  jest.clearAllMocks();
  service = new AuditService(
    mockAuditRepo as unknown as AuditRepository
  );
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuditService.listAuditLogs', () => {
  it('calls auditRepo.findAll with the provided filter', async () => {
    const filter: AuditLogFilter = { action: 'ARCHIVED', page: 1, limit: 10 };
    mockAuditRepo.findAll.mockResolvedValueOnce(paginatedAll);

    await service.listAuditLogs(ADMIN_ID, filter);

    expect(mockAuditRepo.findAll).toHaveBeenCalledTimes(1);
    expect(mockAuditRepo.findAll).toHaveBeenCalledWith(filter);
  });

  it('returns the paginated result from the repository', async () => {
    mockAuditRepo.findAll.mockResolvedValueOnce(paginatedAll);

    const result = await service.listAuditLogs(ADMIN_ID, {});

    expect(result).toEqual(paginatedAll);
    expect(result.total).toBe(10);
    expect(result.data).toHaveLength(10);
  });

  it('passes entity_type and entity_id filter to repository', async () => {
    const entityId = 'task-abc';
    const filter: AuditLogFilter = { entity_type: 'task', entity_id: entityId };
    mockAuditRepo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await service.listAuditLogs(ADMIN_ID, filter);

    expect(mockAuditRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ entity_type: 'task', entity_id: entityId })
    );
  });

  it('passes actor_id filter to repository', async () => {
    const actorId = 'user-abc';
    const filter: AuditLogFilter = { actor_id: actorId };
    mockAuditRepo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await service.listAuditLogs(ADMIN_ID, filter);

    expect(mockAuditRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ actor_id: actorId })
    );
  });

  it('passes action filter to repository', async () => {
    const filter: AuditLogFilter = { action: 'RESTORED' };
    mockAuditRepo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await service.listAuditLogs(ADMIN_ID, filter);

    expect(mockAuditRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESTORED' })
    );
  });

  it('passes date range filter to repository', async () => {
    const filter: AuditLogFilter = {
      from_date: '2024-01-01',
      to_date: '2024-01-31',
    };
    mockAuditRepo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await service.listAuditLogs(ADMIN_ID, filter);

    expect(mockAuditRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        from_date: '2024-01-01',
        to_date: '2024-01-31',
      })
    );
  });

  it('passes pagination params to repository', async () => {
    const filter: AuditLogFilter = { page: 3, limit: 5 };
    mockAuditRepo.findAll.mockResolvedValueOnce({
      data: [],
      total: 30,
      page: 3,
      limit: 5,
    });

    await service.listAuditLogs(ADMIN_ID, filter);

    expect(mockAuditRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 5 })
    );
  });

  it('propagates repository errors', async () => {
    mockAuditRepo.findAll.mockRejectedValueOnce(new Error('DB error'));

    await expect(service.listAuditLogs(ADMIN_ID, {})).rejects.toThrow('DB error');
  });
});

describe('AuditService.getAuditLog', () => {
  it('returns the audit log entry when it exists', async () => {
    mockAuditRepo.findById.mockResolvedValueOnce(singleLog);

    const result = await service.getAuditLog(ADMIN_ID, LOG_ID);

    expect(result).toEqual(singleLog);
    expect(mockAuditRepo.findById).toHaveBeenCalledWith(LOG_ID);
  });

  it('throws a 404 error when the audit log entry does not exist', async () => {
    mockAuditRepo.findById.mockResolvedValueOnce(null);

    await expect(service.getAuditLog(ADMIN_ID, 'non-existent')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('returns the complete log entry with before_state and after_state', async () => {
    const logWithStates = buildLog(LOG_ID, {
      before_state: { status: 'in_progress' },
      after_state: { status: 'archived', archived_at: '2024-01-15T10:00:00Z' },
    });
    mockAuditRepo.findById.mockResolvedValueOnce(logWithStates);

    const result = await service.getAuditLog(ADMIN_ID, LOG_ID);

    expect(result.before_state).toEqual({ status: 'in_progress' });
    expect(result.after_state).toEqual({
      status: 'archived',
      archived_at: '2024-01-15T10:00:00Z',
    });
  });

  it('propagates unexpected repository errors', async () => {
    mockAuditRepo.findById.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(service.getAuditLog(ADMIN_ID, LOG_ID)).rejects.toThrow(
      'DB connection lost'
    );
  });
});
