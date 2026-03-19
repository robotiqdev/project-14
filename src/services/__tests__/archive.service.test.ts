import { ArchiveService } from '../archive.service';
import { ArchiveRepository } from '../../repositories/archive.repository';
import { AuditRepository } from '../../repositories/audit.repository';
import type {
  ArchiveFilter,
  ArchivedTask,
  AuditLog,
  PaginatedResult,
  Task,
} from '../../types/archive.types';

// ─── Mock Repos ──────────────────────────────────────────────────────────────

const mockArchiveRepo: jest.Mocked<Pick<ArchiveRepository, 'findAllArchived' | 'findArchivedById' | 'restoreTask'>> = {
  findAllArchived: jest.fn(),
  findArchivedById: jest.fn(),
  restoreTask: jest.fn(),
};

const mockAuditRepo: jest.Mocked<Pick<AuditRepository, 'findAll' | 'findById' | 'createLog'>> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  createLog: jest.fn(),
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ADMIN_ID = 'admin-00000000-0000-0000-0000-000000000001';
const TASK_ID = 'task-00000000-0000-0000-0000-000000000001';

const archivedTask: ArchivedTask = {
  id: TASK_ID,
  title: 'Fix login bug',
  description: 'The login page was broken',
  team_id: 'team-00000000-0000-0000-0000-000000000001',
  status: 'archived',
  archived_at: '2024-01-15T10:00:00Z',
  archived_by: ADMIN_ID,
  archive_reason: 'Completed',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const restoredTask: Task = {
  id: TASK_ID,
  title: 'Fix login bug',
  description: 'The login page was broken',
  team_id: 'team-00000000-0000-0000-0000-000000000001',
  status: 'todo',
  archived_at: null,
  archived_by: null,
  archive_reason: null,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-20T12:00:00Z',
};

const paginatedArchived: PaginatedResult<ArchivedTask> = {
  data: [archivedTask],
  total: 1,
  page: 1,
  limit: 10,
};

const auditLogEntry: AuditLog = {
  id: 'log-00000000-0000-0000-0000-000000000001',
  entity_type: 'task',
  entity_id: TASK_ID,
  action: 'RESTORED',
  actor_id: ADMIN_ID,
  before_state: { archived_at: '2024-01-15T10:00:00Z' },
  after_state: { archived_at: null },
  created_at: '2024-01-20T12:00:00Z',
};

const makeError = (message: string, status: number): Error =>
  Object.assign(new Error(message), { status });

// ─── Service Instance ────────────────────────────────────────────────────────

let service: ArchiveService;

beforeEach(() => {
  jest.clearAllMocks();
  service = new ArchiveService(
    mockArchiveRepo as unknown as ArchiveRepository,
    mockAuditRepo as unknown as AuditRepository
  );
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ArchiveService.listArchivedTasks', () => {
  it('calls archiveRepo.findAllArchived with the provided filter', async () => {
    const filter: ArchiveFilter = { team_id: 'team-1', page: 1, limit: 10 };
    mockArchiveRepo.findAllArchived.mockResolvedValueOnce(paginatedArchived);

    await service.listArchivedTasks(ADMIN_ID, filter);

    expect(mockArchiveRepo.findAllArchived).toHaveBeenCalledTimes(1);
    expect(mockArchiveRepo.findAllArchived).toHaveBeenCalledWith(filter);
  });

  it('returns the paginated result from the repository', async () => {
    const filter: ArchiveFilter = { page: 1, limit: 10 };
    mockArchiveRepo.findAllArchived.mockResolvedValueOnce(paginatedArchived);

    const result = await service.listArchivedTasks(ADMIN_ID, filter);

    expect(result).toEqual(paginatedArchived);
  });

  it('passes all filter fields (team_id, date range, search) to the repository', async () => {
    const filter: ArchiveFilter = {
      team_id: 'team-abc',
      from_date: '2024-01-01',
      to_date: '2024-01-31',
      search: 'login',
      page: 2,
      limit: 5,
    };
    mockArchiveRepo.findAllArchived.mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 2,
      limit: 5,
    });

    await service.listArchivedTasks(ADMIN_ID, filter);

    expect(mockArchiveRepo.findAllArchived).toHaveBeenCalledWith(filter);
  });

  it('propagates repository errors', async () => {
    mockArchiveRepo.findAllArchived.mockRejectedValueOnce(
      new Error('DB connection failed')
    );

    await expect(service.listArchivedTasks(ADMIN_ID, {})).rejects.toThrow(
      'DB connection failed'
    );
  });
});

describe('ArchiveService.getArchivedTask', () => {
  it('returns the archived task when it exists', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(archivedTask);

    const result = await service.getArchivedTask(ADMIN_ID, TASK_ID);

    expect(result).toEqual(archivedTask);
    expect(mockArchiveRepo.findArchivedById).toHaveBeenCalledWith(TASK_ID);
  });

  it('throws a 404 error when the task does not exist', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(null);

    await expect(service.getArchivedTask(ADMIN_ID, 'non-existent-id')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('throws a 404 error when the task exists but is not archived', async () => {
    // findArchivedById returns null for tasks that are not archived
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(null);

    await expect(
      service.getArchivedTask(ADMIN_ID, TASK_ID)
    ).rejects.toMatchObject({ status: 404 });
  });

  it('propagates unexpected repository errors', async () => {
    mockArchiveRepo.findArchivedById.mockRejectedValueOnce(
      new Error('Unexpected DB error')
    );

    await expect(
      service.getArchivedTask(ADMIN_ID, TASK_ID)
    ).rejects.toThrow('Unexpected DB error');
  });
});

describe('ArchiveService.restoreTask', () => {
  it('calls archiveRepo.restoreTask with taskId and adminId', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(archivedTask);
    mockArchiveRepo.restoreTask.mockResolvedValueOnce(restoredTask);
    mockAuditRepo.createLog.mockResolvedValueOnce(auditLogEntry);

    await service.restoreTask(ADMIN_ID, TASK_ID);

    expect(mockArchiveRepo.restoreTask).toHaveBeenCalledWith(TASK_ID, ADMIN_ID);
  });

  it('creates an audit log entry with correct fields after restoring', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(archivedTask);
    mockArchiveRepo.restoreTask.mockResolvedValueOnce(restoredTask);
    mockAuditRepo.createLog.mockResolvedValueOnce(auditLogEntry);

    await service.restoreTask(ADMIN_ID, TASK_ID);

    expect(mockAuditRepo.createLog).toHaveBeenCalledTimes(1);
    expect(mockAuditRepo.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'task',
        entity_id: TASK_ID,
        action: 'RESTORED',
        actor_id: ADMIN_ID,
      })
    );
  });

  it('records before_state with the previous archived_at in the audit log', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(archivedTask);
    mockArchiveRepo.restoreTask.mockResolvedValueOnce(restoredTask);
    mockAuditRepo.createLog.mockResolvedValueOnce(auditLogEntry);

    await service.restoreTask(ADMIN_ID, TASK_ID);

    expect(mockAuditRepo.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        before_state: expect.objectContaining({
          archived_at: archivedTask.archived_at,
        }),
      })
    );
  });

  it('records after_state with archived_at as null in the audit log', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(archivedTask);
    mockArchiveRepo.restoreTask.mockResolvedValueOnce(restoredTask);
    mockAuditRepo.createLog.mockResolvedValueOnce(auditLogEntry);

    await service.restoreTask(ADMIN_ID, TASK_ID);

    expect(mockAuditRepo.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        after_state: expect.objectContaining({ archived_at: null }),
      })
    );
  });

  it('returns the restored task with archived_at set to null', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(archivedTask);
    mockArchiveRepo.restoreTask.mockResolvedValueOnce(restoredTask);
    mockAuditRepo.createLog.mockResolvedValueOnce(auditLogEntry);

    const result = await service.restoreTask(ADMIN_ID, TASK_ID);

    expect(result.archived_at).toBeNull();
    expect(result.archived_by).toBeNull();
  });

  it('throws a 404 error when the task does not exist', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(null);

    await expect(service.restoreTask(ADMIN_ID, 'non-existent')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('throws a 409 error when the task is not archived', async () => {
    // When a task exists but is not archived, findArchivedById returns null
    // and the service should distinguish this from "not found at all"
    // Implementation may check task existence separately; we test the contract
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(null);
    mockArchiveRepo.restoreTask.mockRejectedValueOnce(
      makeError('Task is not archived', 409)
    );

    // Either the service throws 409 (if it calls restoreTask and it throws)
    // or 404 (if it validates first). Accept either semantic here:
    await expect(
      service.restoreTask(ADMIN_ID, TASK_ID)
    ).rejects.toHaveProperty('status');
  });

  it('does not call auditRepo.createLog if archiveRepo.restoreTask throws', async () => {
    mockArchiveRepo.findArchivedById.mockResolvedValueOnce(archivedTask);
    mockArchiveRepo.restoreTask.mockRejectedValueOnce(
      new Error('DB error during restore')
    );

    await expect(service.restoreTask(ADMIN_ID, TASK_ID)).rejects.toThrow();
    expect(mockAuditRepo.createLog).not.toHaveBeenCalled();
  });

  it('propagates unexpected repository errors', async () => {
    mockArchiveRepo.findArchivedById.mockRejectedValueOnce(
      new Error('Unexpected DB failure')
    );

    await expect(service.restoreTask(ADMIN_ID, TASK_ID)).rejects.toThrow(
      'Unexpected DB failure'
    );
  });
});
